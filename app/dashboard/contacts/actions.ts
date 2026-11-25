"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgMember } from "@/lib/org/auth";
import { sendSms } from "@/lib/sms/send";
import { sendGmailMessage } from "@/lib/google/send-email";
import { emitDomainEvent } from "@/lib/workflows/events";

export async function createContact(input: {
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: "lead" | "booked" | "customer" | "inactive";
  note?: string;
  /** Optional first journey stage — applied in the same request */
  pipelineStageId?: string | null;
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

  const stageId = input.pipelineStageId ?? null;

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
      ...(stageId ? { pipeline_stage_id: stageId } : {}),
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

  try {
    const contactName =
      [firstName, lastName].filter(Boolean).join(" ") || "Contact";
    await emitDomainEvent({
      organizationId: input.organizationId,
      type: "contact.created",
      entityType: "contact",
      entityId: contact.id as string,
      payload: {
        contact_id: contact.id,
        email,
        phone,
        first_name: firstName,
        last_name: lastName,
        status,
        source: "manual",
        contact_name: contactName,
        name: contactName,
        pipeline_stage_id: stageId,
      },
    });
  } catch (err) {
    console.error("[createContact] emit failed", err);
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
  await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

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

  const { data: contact, error } = await admin
    .from("contacts")
    .update(updates)
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!contact) throw new Error("Contact not found in this organization");

  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${input.contactId}`);
}

/**
 * Single round-trip save for contact detail page: fields + optional stage.
 * Avoids sequential updateContact + setContactPipelineStage from the client.
 */
export async function saveContactDetails(input: {
  contactId: string;
  organizationId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: "lead" | "booked" | "customer" | "inactive";
  pipelineStageId?: string | null;
}) {
  await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const { data: before } = await admin
    .from("contacts")
    .select("id, first_name, last_name, pipeline_stage_id")
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!before) throw new Error("Contact not found in this organization");

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

  const nextStageId =
    input.pipelineStageId !== undefined ? input.pipelineStageId : undefined;
  const fromStageId = (before.pipeline_stage_id as string | null) ?? null;
  const stageChanged =
    nextStageId !== undefined && nextStageId !== fromStageId;

  if (stageChanged) {
    updates.pipeline_stage_id = nextStageId as string | null;
  }

  const { data: contact, error } = await admin
    .from("contacts")
    .update(updates)
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!contact) throw new Error("Contact not found in this organization");

  if (stageChanged) {
    const stageIds = [nextStageId, fromStageId].filter(
      (id): id is string => Boolean(id),
    );
    const nameById = new Map<string, string>();
    if (stageIds.length) {
      const { data: stages } = await admin
        .from("pipeline_stages")
        .select("id, name")
        .in("id", stageIds);
      for (const s of stages ?? []) {
        nameById.set(s.id as string, s.name as string);
      }
    }

    const stageName = nextStageId
      ? nameById.get(nextStageId) ?? "Unknown stage"
      : "Unassigned";
    const fromStageName = fromStageId
      ? nameById.get(fromStageId) ?? "Unassigned"
      : "Unassigned";

    const contactName =
      [
        input.firstName ?? before.first_name,
        input.lastName ?? before.last_name,
      ]
        .filter(Boolean)
        .join(" ") || "Contact";

    try {
      await emitDomainEvent({
        organizationId: input.organizationId,
        type: "pipeline.stage_changed",
        entityType: "contact",
        entityId: input.contactId,
        payload: {
          contact_id: input.contactId,
          contact_name: contactName,
          stage_id: nextStageId,
          stage_name: stageName,
          from_stage_id: fromStageId,
          from_stage_name: fromStageName,
        },
        idempotencyKey: `pipeline.stage:${input.contactId}:${nextStageId ?? "none"}:${Date.now()}`,
      });
    } catch (err) {
      console.error("[saveContactDetails] emit failed", err);
    }
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${input.contactId}`);
  if (stageChanged) {
    revalidatePath("/dashboard/pipeline");
  }
}

export async function addContactNote(input: {
  organizationId: string;
  contactId: string;
  body: string;
}): Promise<{ id: string; body: string; created_at: string }> {
  const { user } = await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const body = input.body.trim();
  if (!body) throw new Error("Note cannot be empty");

  const { data, error } = await admin
    .from("contact_notes")
    .insert({
      organization_id: input.organizationId,
      contact_id: input.contactId,
      body,
      created_by: user.id,
    })
    .select("id, body, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not add note");

  revalidatePath(`/dashboard/contacts/${input.contactId}`);
  return {
    id: data.id as string,
    body: data.body as string,
    created_at: data.created_at as string,
  };
}

export async function sendContactEmail(input: {
  organizationId: string;
  contactId: string;
  subject: string;
  body: string;
}) {
  await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const { data: contact } = await admin
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

  await admin
    .from("contacts")
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contact.id)
    .eq("organization_id", input.organizationId);

  revalidatePath(`/dashboard/contacts/${contact.id}`);
  revalidatePath("/dashboard/contacts");
}

export async function sendContactSms(input: {
  organizationId: string;
  contactId: string;
  body: string;
}) {
  await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

  const { data: contact } = await admin
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

  await admin
    .from("contacts")
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contact.id)
    .eq("organization_id", input.organizationId);

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
  await requireOrgMember(input.organizationId);
  const admin = createAdminClient();

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
      const { data: existing } = await admin
        .from("contacts")
        .select("id, tags")
        .eq("organization_id", input.organizationId)
        .ilike("email", email)
        .maybeSingle();

      if (existing) {
        const tags = Array.isArray(existing.tags) ? existing.tags : [];
        const nextTags = Array.from(new Set([...tags, "imported"]));
        const { error } = await admin
          .from("contacts")
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: phone ?? undefined,
            status,
            tags: nextTags,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .eq("organization_id", input.organizationId);
        if (error) {
          skipped += 1;
          continue;
        }
        updated += 1;
        continue;
      }
    }

    const { error } = await admin.from("contacts").insert({
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

  const { data: before } = await admin
    .from("contacts")
    .select("id, first_name, last_name, pipeline_stage_id")
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!before) throw new Error("Contact not found in this organization");

  const fromStageId = (before.pipeline_stage_id as string | null) ?? null;
  if (fromStageId === input.stageId) {
    return;
  }

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

  const stageIds = [input.stageId, fromStageId].filter(
    (id): id is string => Boolean(id),
  );
  const nameById = new Map<string, string>();
  if (stageIds.length) {
    const { data: stages } = await admin
      .from("pipeline_stages")
      .select("id, name")
      .in("id", stageIds);
    for (const s of stages ?? []) {
      nameById.set(s.id as string, s.name as string);
    }
  }

  const stageName = input.stageId
    ? nameById.get(input.stageId) ?? "Unknown stage"
    : "Unassigned";
  const fromStageName = fromStageId
    ? nameById.get(fromStageId) ?? "Unassigned"
    : "Unassigned";

  const contactName =
    [before.first_name, before.last_name].filter(Boolean).join(" ") || "Contact";

  try {
    await emitDomainEvent({
      organizationId: input.organizationId,
      type: "pipeline.stage_changed",
      entityType: "contact",
      entityId: input.contactId,
      payload: {
        contact_id: input.contactId,
        contact_name: contactName,
        stage_id: input.stageId,
        stage_name: stageName,
        from_stage_id: fromStageId,
        from_stage_name: fromStageName,
      },
      idempotencyKey: `pipeline.stage:${input.contactId}:${input.stageId ?? "none"}:${Date.now()}`,
    });
  } catch (err) {
    console.error("[setContactPipelineStage] emit failed", err);
  }

  revalidatePath("/dashboard/contacts");
  revalidatePath(`/dashboard/contacts/${input.contactId}`);
  revalidatePath("/dashboard/pipeline");
}
