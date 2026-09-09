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

export async function updateContact(input: {
  contactId: string;
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: "lead" | "booked" | "customer" | "inactive";
}) {
  await requireOrgMember(input.organizationId);
  const supabase = await createClient();

  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.firstName !== undefined) {
    updates.first_name = input.firstName.trim() || null;
  }
  if (input.lastName !== undefined) {
    updates.last_name = input.lastName.trim() || null;
  }
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (email && !email.includes("@")) throw new Error("Invalid email");
    updates.email = email || null;
  }
  if (input.phone !== undefined) {
    const phone = input.phone.trim();
    if (phone && phone.replace(/[\s\-()]/g, "").length < 8) {
      throw new Error("Enter a valid phone including country code");
    }
    updates.phone = phone || null;
  }
  if (input.status !== undefined) {
    updates.status = input.status;
  }

  const { error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${input.contactId}`);
}

export async function addContactNote(input: {
  organizationId: string;
  contactId: string;
  body: string;
}) {
  const { supabase, user } = await requireOrgMember(input.organizationId);

  const body = input.body.trim();
  if (!body) throw new Error("Note cannot be empty");

  const { error } = await supabase.from("contact_notes").insert({
    organization_id: input.organizationId,
    contact_id: input.contactId,
    body,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/contacts/${input.contactId}`);
}