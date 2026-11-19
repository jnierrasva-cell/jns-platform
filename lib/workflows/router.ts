import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkflowGraph } from "@/lib/workflows/types";
import { startWorkflowRun } from "@/lib/workflows/runner";

/**
 * Find active workflows whose trigger_type matches the event,
 * for this org OR system recipes (organization_id IS NULL).
 */
export async function routeEventToWorkflows(input: {
  organizationId: string;
  eventType: string;
  eventId: string | null;
  payload: Record<string, unknown>;
}): Promise<number> {
  const admin = createAdminClient();

  const { data: workflows, error } = await admin
    .from("workflows")
    .select("id, key, organization_id, trigger_type, trigger_config, settings, is_system")
    .eq("status", "active")
    .eq("trigger_type", input.eventType)
    .or(`organization_id.eq.${input.organizationId},organization_id.is.null`);

  if (error) {
    console.error("[workflow.router]", error.message);
    return 0;
  }

  let started = 0;

  for (const wf of workflows ?? []) {
    const { data: version } = await admin
      .from("workflow_versions")
      .select("id, graph")
      .eq("workflow_id", wf.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!version?.graph) continue;

    const graph = version.graph as WorkflowGraph;
    const runIdem =
      input.eventId != null
        ? `run:${wf.id}:${input.eventId}`
        : `run:${wf.id}:${input.eventType}:${Date.now()}`;

    try {
      const ok = await startWorkflowRun({
        organizationId: input.organizationId,
        workflowId: wf.id as string,
        versionId: version.id as string,
        graph,
        triggerEvent: input.eventType,
        triggerPayload: {
          ...input.payload,
          _workflow_key: wf.key,
          _event_id: input.eventId,
        },
        idempotencyKey: runIdem,
      });
      if (ok) started += 1;
    } catch (err) {
      console.error("[workflow.router] start failed", wf.key, err);
    }
  }

  return started;
}
