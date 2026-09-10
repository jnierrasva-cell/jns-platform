"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertContactByEmail } from "@/lib/contacts/upsert";
import { getValidGoogleAccessToken } from "@/lib/google/token";
import {
  assignContactPipelineStage,
  getFirstPipelineStageId,
} from "@/lib/pipeline/assign";

async function sendIntakeAutoAck(input: {
  organizationId: string;
  toEmail: string;
  toName: string;
  businessName: string;
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

    await fetch(
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
  } catch (err) {
    console.error("[intake-auto-ack]", err);
  }
}

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

  const { data: form } = await supabase
    .from("intake_forms")
    .select("id, name, slug, is_published, organization_id")
    .eq("id", input.formId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!form || !form.is_published) {
    throw new Error("This form is not available");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  const businessName = org?.name ?? "our team";

  const firstName = name.split(" ")[0] ?? name;
  const lastName = name.split(" ").slice(1).join(" ") || undefined;

  const contactId = await upsertContactByEmail({
    organizationId: input.organizationId,
    email,
    firstName,
    source: "intake_form",
  });

  const { data: existing } = await supabase
    .from("contacts")
    .select("tags")
    .eq("id", contactId)
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
    .eq("id", contactId);

  // New leads → first pipeline stage (only if unassigned)
  const firstStageId = await getFirstPipelineStageId(input.organizationId);
  await assignContactPipelineStage({
    contactId,
    organizationId: input.organizationId,
    stageId: firstStageId,
    onlyIfEmpty: true,
  });

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
      form_slug: form.slug,
      form_name: form.name,
    },
  });

  if (error) throw new Error(error.message);

  await sendIntakeAutoAck({
    organizationId: input.organizationId,
    toEmail: email,
    toName: name,
    businessName,
  });

  return { ok: true as const, contactId };
}