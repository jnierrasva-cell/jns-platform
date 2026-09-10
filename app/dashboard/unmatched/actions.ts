"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { upsertContactByEmail } from "@/lib/contacts/upsert";

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

export async function convertUnmatchedToLead(input: {
  organizationId: string;
  unmatchedId: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const { data: row } = await supabase
    .from("unmatched_emails")
    .select("id, from_email, from_name, subject, status")
    .eq("id", input.unmatchedId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!row || row.status !== "pending") {
    throw new Error("Unmatched email not found");
  }

  const firstName =
    row.from_name?.split(" ")[0] ||
    row.from_email.split("@")[0] ||
    undefined;

  const contactId = await upsertContactByEmail({
    organizationId: input.organizationId,
    email: row.from_email,
    firstName,
    source: "unmatched_convert",
  });

  await supabase
    .from("unmatched_emails")
    .update({
      status: "converted",
      contact_id: contactId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  revalidatePath("/dashboard/unmatched");
  revalidatePath("/dashboard/contacts");
  return { contactId };
}

export async function ignoreUnmatched(input: {
  organizationId: string;
  unmatchedId: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const { error } = await supabase
    .from("unmatched_emails")
    .update({
      status: "ignored",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.unmatchedId)
    .eq("organization_id", input.organizationId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/unmatched");
}