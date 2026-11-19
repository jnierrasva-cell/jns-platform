"use server";

import { revalidatePath } from "next/cache";
import { requireOrgManager } from "@/lib/org/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { startWorkflowRun } from "@/lib/workflows/runner";

export async function getWorkflowRunSteps(
  organizationId: string,
  runId: string,
) {
  await requireOrgManager(organizationId);
  const admin = createAdminClient();

  const { data: run } = await admin
    .from("workflow_runs")
    .select("id, organization_id")
    .eq("id", runId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!run) throw new Error("Run not found");

  const { data: steps, error } = await admin
    .from("workflow_run_steps")
    .select(
      "id, node_id, action_key, status, input, output, error, started_at, finished_at",
    )
    .eq("run_id", runId)
    .order("started_at", { ascending: true });

  if (error) throw new Error(error.message);
  return steps ?? [];
}

export async function retryWorkflowRun(
  organizationId: string,
  runId: string,
) {
  await requireOrgManager(organizationId);
  const admin = createAdminClient();

  const { data: run } = await admin
    .from("workflow_runs")
    .select(
      "id, organization_id, workflow_id, version_id, trigger_event, trigger_payload, status",
    )
    .eq("id", runId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!run) throw new Error("Run not found");
  if (run.status !== "failed" && run.status !== "completed") {
    throw new Error("Only failed or completed runs can be retried");
  }

  const { data: version } = await admin
    .from("workflow_versions")
    .select("id, graph")
    .eq("id", run.version_id)
    .maybeSingle();

  if (!version?.graph) throw new Error("Workflow version missing");

  await startWorkflowRun({
    organizationId,
    workflowId: run.workflow_id as string,
    versionId: version.id as string,
    graph: version.graph as never,
    triggerEvent: run.trigger_event as string,
    triggerPayload: (run.trigger_payload as Record<string, unknown>) ?? {},
    idempotencyKey: `retry:${runId}:${Date.now()}`,
  });

  revalidatePath("/dashboard/automation");
  return { ok: true as const };
}
