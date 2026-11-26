"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertContactByEmail } from "@/lib/contacts/upsert";
import { getValidGoogleAccessToken } from "@/lib/google/token";
import {
  assignContactPipelineStage,
  getFirstPipelineStageId,
} from "@/lib/pipeline/assign";
import { emitDomainEvent } from "@/lib/workflows/events";

const MAX_FIELD_LEN = 2000;
const MAX_FIELDS = 40;
const MAX_NAME_LEN = 120;
const ABUSE_WINDOW_MS = 10 * 60 * 1000;
const ABUSE_MAX_PER_EMAIL = 8;

async function resolvePublishedForm(orgSlug: string, formSlug: string) {
  const orgKey = orgSlug.trim();
  const formKey = formSlug.trim();
  if (!orgKey || !formKey || orgKey.length > 120 || formKey.length > 80) {
    throw new Error("This form is not available");
  }

  const supabase = createAdminClient();

  let org: { id: string; name: string } | null = null;
  const bySlug = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgKey)
    .maybeSingle();
  if (bySlug.data) {
    org = bySlug.data as { id: string; name: string };
  } else {
    const byId = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgKey)
      .maybeSingle();
    org = (byId.data as { id: string; name: string } | null) ?? null;
  }

  if (!org) throw new Error("This form is not available");

  const { data: form } = await supabase
    .from("intake_forms")
    .select("id, name, slug, is_published, organization_id")
    .eq("organization_id", org.id)
    .eq("slug", formKey)
    .maybeSingle();

  if (!form || !form.is_published) {
    throw new Error("This form is not available");
  }

  return { org, form };
}

async function sendIntakeAutoAck(input: {
  organizationId: string;
  toEmail: string;
  toName: string;
  businessName: string;
  contactId: string;
}) {
  try {
    const { accessToken } = await getValidGoogleAccessToken(
      input.organizationId,
    );

    const fromRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!fromRes.ok) return;

    const profile = await fromRes.json();
    const fromEmail = profile.emailAddress as string;
    if (!fromEmail) return;

    const subject = `Thanks for reaching out to ${input.businessName}`;
    const bodyText = [
      `Hi ${input.toName.split(" ")[0] || "there"},`,
      "",
      `Thanks for contacting ${input.businessName}. We received your details and will get back to you soon.`,
      "",
      "—",
      input.businessName,
    ].join("\n");

    const raw = [
      `From: ${input.businessName} <${fromEmail}>`,
      `To: ${input.toEmail}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      bodyText,
    ].join("\r\n");

    const encoded = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encoded }),
      },
    );

    const admin = createAdminClient();
    if (sendRes.ok) {
      const sent = await sendRes.json().catch(() => ({}));
      await admin.from("email_activity").insert({
        organization_id: input.organizationId,
        contact_id: input.contactId,
        service_key: "intake_form_ack",
        direction: "outbound",
        from_email: fromEmail,
        to_email: input.toEmail,
        subject,
        status: "sent",
        gmail_message_id: sent.id ?? null,
      });
    } else {
      await admin.from("email_activity").insert({
        organization_id: input.organizationId,
        contact_id: input.contactId,
        service_key: "intake_form_ack",
        direction: "outbound",
        from_email: fromEmail,
        to_email: input.toEmail,
        subject,
        status: "failed",
      });
    }
  } catch (err) {
    console.error("[intake-auto-ack]", err);
  }
}

export async function submitIntakeForm(input: {
  /** Canonical keys from the public URL — never trust free-form org/form ids. */
  orgSlug: string;
  formSlug: string;
  responses: Record<string, string>;
}) {
  const { org, form } = await resolvePublishedForm(
    input.orgSlug,
    input.formSlug,
  );
  const organizationId = org.id;
  const supabase = createAdminClient();

  const rawResponses = input.responses || {};
  const keys = Object.keys(rawResponses);
  if (keys.length > MAX_FIELDS) {
    throw new Error("Too many fields submitted");
  }

  const responses: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawResponses)) {
    if (typeof k !== "string" || k.length > 80) continue;
    const s = String(v ?? "").trim();
    if (s.length > MAX_FIELD_LEN) {
      throw new Error("One or more answers are too long");
    }
    responses[k] = s;
  }

  const name = (
    responses.name ||
    responses.full_name ||
    responses.fullName ||
    ""
  ).trim();
  const email = (responses.email || "").trim().toLowerCase();
  const phone = (responses.phone || "").trim() || null;

  const customLines = Object.entries(responses)
    .filter(
      ([k]) =>
        !["name", "full_name", "fullName", "email", "phone", "message"].includes(
          k,
        ),
    )
    .map(([k, v]) => `${k}: ${String(v || "").trim()}`)
    .filter((line) => !line.endsWith(": "));

  const messageBody = (responses.message || "").trim();
  const message =
    [messageBody, ...customLines].filter(Boolean).join("\n\n") || null;

  if (!name) throw new Error("Name is required");
  if (name.length > MAX_NAME_LEN) throw new Error("Name is too long");
  if (!email || !email.includes("@") || email.length > 254) {
    throw new Error("Valid email is required");
  }

  const businessName = org.name ?? "our team";

  const firstName = name.split(" ")[0] ?? name;
  const lastName = name.split(" ").slice(1).join(" ") || undefined;

  const contactId = await upsertContactByEmail({
    organizationId,
    email,
    firstName,
    source: "intake_form",
  });

  // Rate limit: same email → same form within window
  const windowStart = new Date(Date.now() - ABUSE_WINDOW_MS).toISOString();
  const { count: recent } = await supabase
    .from("intake_submissions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("form_id", form.id)
    .eq("email", email)
    .gte("created_at", windowStart);

  if ((recent ?? 0) >= ABUSE_MAX_PER_EMAIL) {
    throw new Error(
      "Too many submissions. Please wait a few minutes and try again.",
    );
  }

  const { data: existing } = await supabase
    .from("contacts")
    .select("tags")
    .eq("id", contactId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const existingTags: string[] = Array.isArray(existing?.tags)
    ? existing.tags
    : [];
  const formTag = form.slug ? `form:${form.slug}` : "intake_form";
  const nextTags = Array.from(
    new Set([...existingTags, "intake", formTag].filter(Boolean)),
  );

  await supabase
    .from("contacts")
    .update({
      phone,
      last_name: lastName ?? null,
      status: "lead",
      tags: nextTags,
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("organization_id", organizationId);

  const firstStageId = await getFirstPipelineStageId(organizationId);
  await assignContactPipelineStage({
    contactId,
    organizationId,
    stageId: firstStageId,
    onlyIfEmpty: true,
  });

  if (message) {
    await supabase.from("contact_notes").insert({
      organization_id: organizationId,
      contact_id: contactId,
      body: `Intake form “${form.name}”:\n\n${message}`,
      created_by: null,
    });
  }

  const { error } = await supabase.from("intake_submissions").insert({
    form_id: form.id,
    organization_id: organizationId,
    contact_id: contactId,
    name,
    email,
    phone,
    message,
    responses,
    payload: {
      ...responses,
      form_slug: form.slug,
      form_name: form.name,
    },
  });

  if (error) throw new Error(error.message);

  await sendIntakeAutoAck({
    organizationId,
    toEmail: email,
    toName: name,
    businessName,
    contactId,
  });

  try {
    await emitDomainEvent({
      organizationId,
      type: "form.submitted",
      entityType: "contact",
      entityId: contactId,
      payload: {
        contact_id: contactId,
        form_id: form.id,
        form_name: form.name,
        form_slug: form.slug,
        name,
        email,
        phone: phone ?? "",
        message: message ?? "",
      },
      idempotencyKey: `form.submitted:${form.id}:${contactId}:${Date.now()}`,
    });
  } catch (wfErr) {
    console.error("[submitIntakeForm] workflow emit:", wfErr);
  }

  return { ok: true as const, contactId };
}
