"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgMember } from "@/lib/org/auth";
import { sendSms } from "@/lib/sms/send";
import { sendGmailMessage } from "@/lib/google/send-email";

export async function createContact(input: {
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: "lead" | "booked" | "customer" | "inactive";
  note?: string;
}): Promise<{ ok: true; contactId: string } | { ok: false; error: string }> {
  const { user } = await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;
  const firstName = input.firstName?.trim() || null;
  const lastName = input.lastName?.trim() || null;
  const status = input.status ?? "lead";

  if (!email && !phone) {
    return { ok: false, error: "Add an email or phone number" };
  }
  if (email && !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address" };
  }
  if (phone && phone.replace(/[\s\-()]/g, "").length < 8) {
    return { ok: false, error: "Enter a valid phone including country code" };
  }

  if (email) {
    const { data: existing, error } = await admin
      .from("contacts")
      .select("id")
      .eq("organization_id", input.organizationId)
      .ilike("email", email)
      .maybeSingle();

    if (error) {
      console.error("[createContact] duplicate check failed:", error);
      return {
        ok: false,
        error: "Could not check for an existing contact. Please try again.",
      };
    }

    if (existing) {
      return { ok: false, error: "A contact with this email already exists" };
    }
  }

  const { data: contact, error } = await admin
    .from("contacts")
    .insert({
      organization_id: input.organizationId,
      email,
      phone,
      first_name: firstName,
      last_name: lastName,
      status,
      source: "manual",
      tags: ["manual"],
      last_contacted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !contact) {
    console.error("[createContact] insert failed:", error);
    return { ok: false, error: "Could not create contact. Please try again." };
  }

  const note = input.note?.trim();
  if (note) {
    const { error: noteError } = await admin.from("contact_notes").insert({
      organization_id: input.organizationId,
      contact_id: contact.id,
      body: note,
      created_by: user.id,
    });
    if (noteError) {
      console.error("[createContact] note insert failed:", noteError);
    }
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard");
  return { ok: true, contactId: contact.id };
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
  const { supabase } = await requireOrgMember(input.organizationId);

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

export async function sendContactEmail(input: {
  organizationId: string;
  contactId: string;
  subject: string;
  body: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email, first_name")
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!contact?.email) {
    throw new Error("This contact has no email address");
  }

  await sendGmailMessage({
    organizationId: input.organizationId,
    toEmail: contact.email,
    subject: input.subject,
    body: input.body,
    contactId: contact.id,
  });

  await supabase
    .from("contacts")
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contact.id);

  revalidatePath(`/dashboard/contacts/${contact.id}`);
  revalidatePath("/dashboard/contacts");
}

export async function sendContactSms(input: {
  organizationId: string;
  contactId: string;
  body: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, phone, first_name")
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!contact?.phone) {
    throw new Error("This contact has no phone number");
  }

  await sendSms({
    organizationId: input.organizationId,
    toPhone: contact.phone,
    body: input.body,
    contactId: contact.id,
  });

  await supabase
    .from("contacts")
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contact.id);

  revalidatePath(`/dashboard/contacts/${contact.id}`);
  revalidatePath("/dashboard/contacts");
}

type ImportRow = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
};

function normalizeStatus(
  value?: string,
): "lead" | "booked" | "customer" | "inactive" {
  const v = (value ?? "lead").trim().toLowerCase();
  if (v === "booked" || v === "customer" || v === "inactive" || v === "lead") {
    return v;
  }
  return "lead";
}

export async function importContactsCsv(input: {
  organizationId: string;
  rows: ImportRow[];
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  if (!input.rows.length) {
    throw new Error("CSV has no data rows");
  }
  if (input.rows.length > 500) {
    throw new Error("Import limit is 500 rows at a time");
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of input.rows) {
    const email = row.email?.trim().toLowerCase() || null;
    const phone = row.phone?.trim() || null;
    const firstName = row.firstName?.trim() || null;
    const lastName = row.lastName?.trim() || null;
    const status = normalizeStatus(row.status);

    if (!email && !phone) {
      skipped += 1;
      continue;
    }
    if (email && !email.includes("@")) {
      skipped += 1;
      continue;
    }

    if (email) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, tags")
        .eq("organization_id", input.organizationId)
        .ilike("email", email)
        .maybeSingle();

      if (existing) {
        const tags = Array.isArray(existing.tags) ? existing.tags : [];
        const nextTags = Array.from(new Set([...tags, "imported"]));
        await supabase
          .from("contacts")
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: phone ?? undefined,
            status,
            tags: nextTags,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        updated += 1;
        continue;
      }
    }

    const { error } = await supabase.from("contacts").insert({
      organization_id: input.organizationId,
      email,
      phone,
      first_name: firstName,
      last_name: lastName,
      status,
      source: "csv_import",
      tags: ["imported"],
      last_contacted_at: new Date().toISOString(),
    });

    if (error) {
      skipped += 1;
      continue;
    }
    created += 1;
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath("/dashboard");
  return { created, updated, skipped };
}

export async function setContactPipelineStage(input: {
  organizationId: string;
  contactId: string;
  stageId: string | null;
}) {
  await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const { error } = await admin
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