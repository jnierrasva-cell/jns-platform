"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertContactByEmail } from "@/lib/contacts/upsert";

export async function submitIntakeForm(input: {
  organizationId: string;
  formId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  const supabase = createAdminClient();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || null;
  const message = input.message?.trim() || null;

  if (!name) throw new Error("Name is required");
  if (!email || !email.includes("@")) throw new Error("Valid email is required");

  // Ensure form is published and belongs to org
  const { data: form } = await supabase
    .from("intake_forms")
    .select("id, is_published, organization_id")
    .eq("id", input.formId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!form || !form.is_published) {
    throw new Error("This form is not available");
  }

  const firstName = name.split(" ")[0] ?? name;
  const lastName = name.split(" ").slice(1).join(" ") || undefined;

  const contactId = await upsertContactByEmail({
    organizationId: input.organizationId,
    email,
    firstName,
    source: "intake_form",
  });

  await supabase
    .from("contacts")
    .update({
      phone,
      last_name: lastName ?? null,
      status: "lead",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  const { error } = await supabase.from("intake_submissions").insert({
    form_id: input.formId,
    organization_id: input.organizationId,
    contact_id: contactId,
    name,
    email,
    phone,
    message,
    payload: {
      name,
      email,
      phone,
      message,
    },
  });

  if (error) throw new Error(error.message);

  return { ok: true as const, contactId };
}