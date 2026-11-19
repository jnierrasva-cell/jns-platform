"use server";

import { revalidatePath } from "next/cache";
import { requireOrgManager } from "@/lib/org/auth";
import {
  installRecipeForOrg,
  setRecipeActive,
} from "@/lib/workflows/install-recipe";
import { SYSTEM_RECIPES } from "@/lib/workflows/recipes";

export async function installAutomationRecipe(
  organizationId: string,
  recipeKey: string,
) {
  await requireOrgManager(organizationId);
  const result = await installRecipeForOrg({
    organizationId,
    recipeKey,
    activate: true,
  });
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard");
  return result;
}

export async function setAutomationRecipeActive(
  organizationId: string,
  recipeKey: string,
  active: boolean,
) {
  await requireOrgManager(organizationId);
  const result = await setRecipeActive({
    organizationId,
    recipeKey,
    active,
  });
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard");
}

export async function listSystemRecipes() {
  return SYSTEM_RECIPES.map((r) => ({
    key: r.key,
    name: r.name,
    description: r.description,
    category: r.category,
    triggerType: r.triggerType,
  }));
}
