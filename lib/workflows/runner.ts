import { createAdminClient } from "@/lib/supabase/admin";
import { getAction } from "@/lib/workflows/actions/registry";
import type {
  ActionContext,
  WorkflowGraph,
} from "@/lib/workflows/types";

export async function startWorkflowRun(input: {
  organizationId: string;
  workflowId: string;
  versionId: string;
  graph: WorkflowGraph;
  triggerEvent: string;
  triggerPayload: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<boolean> {
  const admin = createAdminClient();

  const { data: run, error } = await admin
    .from("workflow_runs")
    .insert({
      organization_id: input.organizationId,
      workflow_id: input.workflowId,
      version_id: input.versionId,
      trigger_event: input.triggerEvent,
      trigger_payload: input.triggerPayload,
      status: "running",
      idempotency_key: input.idempotencyKey ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return false;
    throw new Error(error.message);
  }
  if (!run?.id) return false;

  const runId = run.id as string;
  const stepOutputs: Record<string, unknown> = {};

  try {
    const trigger = input.graph.nodes.find((n) => n.type === "trigger");
    if (!trigger) {
      await failRun(admin, runId, "Graph has no trigger node");
      return true;
    }

    let currentId: string | null = nextNodeId(input.graph, trigger.id);

    while (currentId) {
      const node = input.graph.nodes.find((n) => n.id === currentId);
      if (!node) break;

      if (node.type === "condition") {
        const pass = evaluateCondition(node.config, input.triggerPayload);
        await logStep(admin, {
          runId,
          organizationId: input.organizationId,
          nodeId: node.id,
          actionKey: "condition",
          status: pass ? "completed" : "skipped",
          input: node.config,
          output: { pass },
        });
        currentId = pass
          ? nextNodeId(input.graph, node.id, "pass")
          : nextNodeId(input.graph, node.id, "fail");
        continue;
      }

      if (node.type === "action") {
        const actionKey = String(node.config.action ?? "");
        const handler = getAction(actionKey);
        const params = (node.config.params as Record<string, unknown>) ?? {};
        const resolved = resolveParams(params, input.triggerPayload, stepOutputs);

        if (!handler) {
          await logStep(admin, {
            runId,
            organizationId: input.organizationId,
            nodeId: node.id,
            actionKey,
            status: "failed",
            input: resolved,
            error: `Unknown action: ${actionKey}`,
          });
          await failRun(admin, runId, `Unknown action: ${actionKey}`);
          return true;
        }

        const ctx: ActionContext = {
          organizationId: input.organizationId,
          runId,
          eventType: input.triggerEvent,
          payload: input.triggerPayload,
          stepOutputs,
        };

        const startedAt = new Date().toISOString();
        const result = await handler.execute(resolved, ctx);
        await logStep(admin, {
          runId,
          organizationId: input.organizationId,
          nodeId: node.id,
          actionKey,
          status: result.ok ? "completed" : "failed",
          input: resolved,
          output: result.output ?? {},
          error: result.error,
          startedAt,
        });

        if (!result.ok) {
          await failRun(admin, runId, result.error ?? "Action failed");
          return true;
        }

        stepOutputs[node.id] = result.output ?? {};
        currentId = nextNodeId(input.graph, node.id);
        continue;
      }

      if (node.type === "delay") {
        const ms = delayToMs(node.config.amount, node.config.unit);
        const runAt = new Date(Date.now() + ms).toISOString();
        const resumeId = nextNodeId(input.graph, node.id);

        await admin.from("workflow_jobs").insert({
          organization_id: input.organizationId,
          run_id: runId,
          node_id: resumeId ?? node.id,
          run_at: runAt,
          status: "pending",
          payload: { after_delay_from: node.id, step_outputs: stepOutputs },
        });

        await logStep(admin, {
          runId,
          organizationId: input.organizationId,
          nodeId: node.id,
          actionKey: "delay",
          status: "completed",
          input: node.config,
          output: { run_at: runAt, resume_node: resumeId },
        });

        await admin
          .from("workflow_runs")
          .update({ status: "waiting" })
          .eq("id", runId);
        return true;
      }

      if (node.type === "branch") {
        await logStep(admin, {
          runId,
          organizationId: input.organizationId,
          nodeId: node.id,
          actionKey: "branch",
          status: "skipped",
          input: node.config,
          output: { message: "Branch not implemented in Phase 0" },
        });
        currentId = nextNodeId(input.graph, node.id);
        continue;
      }

      currentId = nextNodeId(input.graph, node.id);
    }

    await admin
      .from("workflow_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Runner error";
    await failRun(admin, runId, msg);
    return true;
  }
}

export async function resumeRunFromJob(job: {
  id: string;
  run_id: string;
  organization_id: string;
  node_id: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("workflow_jobs").update({ status: "done" }).eq("id", job.id);
  await admin
    .from("workflow_runs")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.run_id)
    .eq("status", "waiting");
}

function nextNodeId(
  graph: WorkflowGraph,
  fromId: string,
  when?: string,
): string | null {
  const edges = graph.edges.filter((e) => e.from === fromId);
  if (edges.length === 0) return null;
  if (when) {
    const match = edges.find((e) => e.when === when) ?? edges.find((e) => !e.when);
    return match?.to ?? null;
  }
  return edges[0]?.to ?? null;
}

function evaluateCondition(
  config: Record<string, unknown>,
  payload: Record<string, unknown>,
): boolean {
  const field = config.field ? String(config.field) : null;
  if (!field) return true;
  const value = getPath(payload, field);
  const op = String(config.op ?? "exists");
  if (op === "exists") return value !== undefined && value !== null && value !== "";
  if (op === "eq") return value === config.value;
  if (op === "neq") return value !== config.value;
  if (op === "in") {
    const list = Array.isArray(config.value) ? config.value : [];
    return list.map(String).includes(String(value));
  }
  return true;
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function resolveParams(
  params: Record<string, unknown>,
  payload: Record<string, unknown>,
  stepOutputs: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") {
      out[k] = v.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
        const trimmed = path.trim();
        if (trimmed.startsWith("payload.")) {
          const val = getPath(payload, trimmed.slice("payload.".length));
          return val == null ? "" : String(val);
        }
        if (trimmed.startsWith("steps.")) {
          const val = getPath(
            stepOutputs as Record<string, unknown>,
            trimmed.slice("steps.".length),
          );
          return val == null ? "" : String(val);
        }
        const val = getPath(payload, trimmed);
        return val == null ? "" : String(val);
      });
    } else {
      out[k] = v;
    }
  }
  return out;
}

function delayToMs(amount: number, unit: string): number {
  const n = Number(amount) || 0;
  if (unit === "days") return n * 86400000;
  if (unit === "hours") return n * 3600000;
  return n * 60000;
}

async function logStep(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    runId: string;
    organizationId: string;
    nodeId: string;
    actionKey?: string;
    status: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    startedAt?: string;
  },
) {
  const now = new Date().toISOString();
  await admin.from("workflow_run_steps").insert({
    run_id: input.runId,
    organization_id: input.organizationId,
    node_id: input.nodeId,
    action_key: input.actionKey ?? null,
    status: input.status,
    input: input.input ?? {},
    output: input.output ?? {},
    error: input.error ?? null,
    started_at: input.startedAt ?? now,
    finished_at: now,
  });
}

async function failRun(
  admin: ReturnType<typeof createAdminClient>,
  runId: string,
  error: string,
) {
  await admin
    .from("workflow_runs")
    .update({
      status: "failed",
      error,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}
