import { createAdminClient } from "@/lib/supabase/admin";
import { getRecipe, SYSTEM_RECIPES } from "@/lib/workflows/recipes";
import { preflightRecipe } from "@/lib/workflows/preflight";

export async function installRecipeForOrg(input: {
  organizationId: string;
  recipeKey: string;
  activate?: boolean;
  /** Skip connection/preflight checks (admin/repair only) */
  skipPreflight?: boolean;
}): Promise<{ ok: true; workflowId: string } | { ok: false; error: string }> {
  const recipe = getRecipe(input.recipeKey);
  if (!recipe) return { ok: false, error: "Unknown recipe" };

  const activate = input.activate !== false;

  if (activate && !input.skipPreflight) {
    const pf = await preflightRecipe({
      organizationId: input.organizationId,
      recipeKey: input.recipeKey,
    });
    if (!pf.ok) {
      const msg = pf.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join(" ");
      return { ok: false, error: msg || "Preflight failed" };
    }
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("workflows")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .eq("key", recipe.key)
    .maybeSingle();

  let workflowId = existing?.id as string | undefined;

  if (workflowId) {
    await admin
      .from("workflows")
      .update({
        status: activate ? "active" : "paused",
        name: recipe.name,
        description: recipe.description,
        category: recipe.category,
        trigger_type: recipe.triggerType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workflowId);
  } else {
    const { data: created, error } = await admin
      .from("workflows")
      .insert({
        organization_id: input.organizationId,
        key: recipe.key,
        name: recipe.name,
        description: recipe.description,
        category: recipe.category,
        status: activate ? "active" : "draft",
        trigger_type: recipe.triggerType,
        trigger_config: { event: recipe.triggerType },
        is_system: false,
        settings: {},
      })
      .select("id")
      .single();

    if (error || !created) {
      return { ok: false, error: error?.message ?? "Could not create workflow" };
    }
    workflowId = created.id as string;
  }

  const { data: latest } = await admin
    .from("workflow_versions")
    .select("version")
    .eq("workflow_id", workflowId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = ((latest?.version as number | undefined) ?? 0) + 1;

  const { error: verErr } = await admin.from("workflow_versions").insert({
    workflow_id: workflowId,
    version: nextVersion,
    graph: recipe.graph,
  });

  if (verErr) return { ok: false, error: verErr.message };
  return { ok: true, workflowId };
}

export async function listInstalledRecipeKeys(
  organizationId: string,
): Promise<string[]> {
  const admin = createAdminClient();
  const keys = SYSTEM_RECIPES.map((r) => r.key);
  if (keys.length === 0) return [];

  const { data } = await admin
    .from("workflows")
    .select("key, status")
    .eq("organization_id", organizationId)
    .in("key", keys);

  return (data ?? [])
    .filter((w) => w.status === "active")
    .map((w) => w.key as string);
}

export async function setRecipeActive(input: {
  organizationId: string;
  recipeKey: string;
  active: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.active) {
    const pf = await preflightRecipe({
      organizationId: input.organizationId,
      recipeKey: input.recipeKey,
    });
    if (!pf.ok) {
      const msg = pf.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join(" ");
      return { ok: false, error: msg || "Preflight failed" };
    }
  }

  const admin = createAdminClient();
  const { data: wf } = await admin
    .from("workflows")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("key", input.recipeKey)
    .maybeSingle();

  if (!wf) {
    if (input.active) {
      const r = await installRecipeForOrg({
        organizationId: input.organizationId,
        recipeKey: input.recipeKey,
        activate: true,
      });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    }
    return { ok: true };
  }

  const { error } = await admin
    .from("workflows")
    .update({
      status: input.active ? "active" : "paused",
      updated_at: new Date().toISOString(),
    })
    .eq("id", wf.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
