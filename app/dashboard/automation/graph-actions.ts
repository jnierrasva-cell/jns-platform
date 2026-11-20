"use server";

import { revalidatePath } from "next/cache";
import { requireOrgManager } from "@/lib/org/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkflowGraph } from "@/lib/workflows/types";
import { getRecipe } from "@/lib/workflows/recipes";

export async function saveWorkflowGraph(input: {
  organizationId: string;
  workflowKey: string;
  graph: WorkflowGraph;
}) {
  await requireOrgManager(input.organizationId);
  const admin = createAdminClient();

  const { data: wf } = await admin
    .from("workflows")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("key", input.workflowKey)
    .maybeSingle();

  if (!wf?.id) {
    throw new Error("Workflow not installed. Turn the recipe on first.");
  }

  if (!input.graph?.nodes?.length) {
    throw new Error("Graph must include at least one node");
  }
  const hasTrigger = input.graph.nodes.some((n) => n.type === "trigger");
  if (!hasTrigger) throw new Error("Graph must include a trigger node");

  const { data: latest } = await admin
    .from("workflow_versions")
    .select("version")
    .eq("workflow_id", wf.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = ((latest?.version as number) ?? 0) + 1;

  const { error } = await admin.from("workflow_versions").insert({
    workflow_id: wf.id,
    version,
    graph: input.graph,
  });

  if (error) throw new Error(error.message);

  await admin
    .from("workflows")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", wf.id);

  revalidatePath("/dashboard/automation");
  return { ok: true as const, version };
}

export async function updateRecipeDelay(input: {
  organizationId: string;
  recipeKey: string;
  amount: number;
  unit: "minutes" | "hours" | "days";
}) {
  await requireOrgManager(input.organizationId);
  const admin = createAdminClient();

  const amount = Math.max(1, Math.min(10080, Math.floor(input.amount) || 30));
  const unit = input.unit;

  const { data: wf } = await admin
    .from("workflows")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("key", input.recipeKey)
    .maybeSingle();

  if (!wf?.id) {
    throw new Error("Turn the recipe on before editing delay");
  }

  const { data: latest } = await admin
    .from("workflow_versions")
    .select("version, graph")
    .eq("workflow_id", wf.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let graph = (latest?.graph as WorkflowGraph | null) ?? null;
  if (!graph) {
    const recipe = getRecipe(input.recipeKey);
    if (!recipe) throw new Error("Unknown recipe");
    graph = structuredClone(recipe.graph);
  } else {
    graph = structuredClone(graph);
  }

  const delayNode = graph.nodes.find((n) => n.type === "delay");
  if (!delayNode || delayNode.type !== "delay") {
    throw new Error("This recipe has no delay step to edit");
  }
  delayNode.config = { amount, unit };

  const version = ((latest?.version as number) ?? 0) + 1;
  const { error } = await admin.from("workflow_versions").insert({
    workflow_id: wf.id,
    version,
    graph,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/automation");
  return { ok: true as const, amount, unit, version };
}
