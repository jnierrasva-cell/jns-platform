"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgMember } from "@/lib/org/auth";

type ActionResult = { ok: true } | { ok: false; error: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function createPipelineStage(input: {
  organizationId: string;
  name: string;
}): Promise<ActionResult> {
  try {
    await requireOrgMember(input.organizationId);
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Stage name is required" };

    const admin = createAdminClient();
    const { data: last, error: readError } = await admin
      .from("pipeline_stages")
      .select("position")
      .eq("organization_id", input.organizationId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (readError) {
      console.error("[createPipelineStage] position lookup failed:", readError);
      return { ok: false, error: "Could not load pipeline stages. Please try again." };
    }

    const position = (last?.position ?? -1) + 1;
    const slug = `${slugify(name) || "stage"}-${Math.random().toString(36).slice(2, 5)}`;

    const { error } = await admin.from("pipeline_stages").insert({
      organization_id: input.organizationId,
      name,
      slug,
      position,
    });

    if (error) {
      console.error("[createPipelineStage] insert failed:", error);
      return { ok: false, error: "Could not create stage. Please try again." };
    }

    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/contacts");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create stage",
    };
  }
}

export async function renamePipelineStage(input: {
  organizationId: string;
  stageId: string;
  name: string;
}): Promise<ActionResult> {
  try {
    await requireOrgMember(input.organizationId);
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Stage name is required" };

    const admin = createAdminClient();
    const { data: stage, error } = await admin
      .from("pipeline_stages")
      .update({ name })
      .eq("id", input.stageId)
      .eq("organization_id", input.organizationId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[renamePipelineStage] update failed:", error);
      return { ok: false, error: "Could not rename stage. Please try again." };
    }
    if (!stage) return { ok: false, error: "Stage not found in this organization" };

    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/contacts");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not rename stage",
    };
  }
}

export async function deletePipelineStage(input: {
  organizationId: string;
  stageId: string;
}): Promise<ActionResult> {
  try {
    await requireOrgMember(input.organizationId);
    const admin = createAdminClient();
    const { count, error: countError } = await admin
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", input.organizationId)
      .eq("pipeline_stage_id", input.stageId);

    if (countError) {
      console.error("[deletePipelineStage] contact count failed:", countError);
      return { ok: false, error: "Could not check whether the stage is in use." };
    }
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: "Move contacts out of this stage before deleting it",
      };
    }

    const { data: stage, error } = await admin
      .from("pipeline_stages")
      .delete()
      .eq("id", input.stageId)
      .eq("organization_id", input.organizationId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[deletePipelineStage] delete failed:", error);
      return { ok: false, error: "Could not delete stage. Please try again." };
    }
    if (!stage) return { ok: false, error: "Stage not found in this organization" };

    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/contacts");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not delete stage",
    };
  }
}

export async function setContactPipelineStage(input: {
  organizationId: string;
  contactId: string;
  stageId: string | null;
}) {
  await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const { data: contact, error } = await admin
    .from("contacts")
    .update({
      pipeline_stage_id: input.stageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!contact) throw new Error("Contact not found in this organization");
  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${input.contactId}`);
  revalidatePath("/dashboard");
}
