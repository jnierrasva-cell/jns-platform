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
    .slice(0, 48);
}

export async function createIntakeForm(input: {
  organizationId: string;
  name: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const name = input.name.trim();
  if (!name) throw new Error("Form name is required");

  let slug = slugify(name) || "form";
  // ensure unique-ish slug
  slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from("intake_forms").insert({
    organization_id: input.organizationId,
    name,
    slug,
    is_published: true,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/forms");
}

export async function updateIntakeForm(input: {
  organizationId: string;
  formId: string;
  name?: string;
  successMessage?: string;
  isPublished?: boolean;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const updates: Record<string, string | boolean> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Form name is required");
    updates.name = name;
  }

  if (input.successMessage !== undefined) {
    updates.success_message = input.successMessage.trim();
  }

  if (input.isPublished !== undefined) {
    updates.is_published = input.isPublished;
  }

  const { error } = await supabase
    .from("intake_forms")
    .update(updates)
    .eq("id", input.formId)
    .eq("organization_id", input.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/forms");
}