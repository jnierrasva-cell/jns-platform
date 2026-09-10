"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireOrgMember(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");
  return { supabase, user };
}

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
}) {
  const { supabase } = await requireOrgMember(input.organizationId);
  const name = input.name.trim();
  if (!name) throw new Error("Stage name is required");

  const { data: last } = await supabase
    .from("pipeline_stages")
    .select("position")
    .eq("organization_id", input.organizationId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? -1) + 1;
  const slug = `${slugify(name) || "stage"}-${Math.random().toString(36).slice(2, 5)}`;

  const { error } = await supabase.from("pipeline_stages").insert({
    organization_id: input.organizationId,
    name,
    slug,
    position,
    color: "cyan",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/contacts");
}

export async function renamePipelineStage(input: {
  organizationId: string;
  stageId: string;
  name: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);
  const name = input.name.trim();
  if (!name) throw new Error("Stage name is required");

  const { error } = await supabase
    .from("pipeline_stages")
    .update({ name })
    .eq("id", input.stageId)
    .eq("organization_id", input.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/contacts");
}

export async function deletePipelineStage(input: {
  organizationId: string;
  stageId: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const { count } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("pipeline_stage_id", input.stageId);

  if ((count ?? 0) > 0) {
    throw new Error("Move contacts out of this stage before deleting it");
  }

  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", input.stageId)
    .eq("organization_id", input.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/contacts");
}

export async function setContactPipelineStage(input: {
  organizationId: string;
  contactId: string;
  stageId: string | null;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const { error } = await supabase
    .from("contacts")
    .update({
      pipeline_stage_id: input.stageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${input.contactId}`);
  revalidatePath("/dashboard");
}