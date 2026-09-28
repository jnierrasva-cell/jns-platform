import { createAdminClient } from "@/lib/supabase/admin";
import { getValidGoogleAccessToken } from "@/lib/google/token";

type SendAutoAckInput = {
  organizationId: string;
  toEmail: string;
  fromName?: string;
  threadId?: string;
  inReplyToMessageId?: string;
  firstName?: string;
  /** Defaults to gmail_auto_ack */
  templateKey?: string;
};

function applyTemplate(
  template: string,
  vars: { first_name: string; business_name: string },
) {
  return template
    .replaceAll("{{first_name}}", vars.first_name)
    .replaceAll("{{business_name}}", vars.business_name);
}

function toBase64Url(str: string) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function domainOf(email: string) {
  return email.toLowerCase().split("@")[1] ?? "";
}

export async function sendAutoAck(input: SendAutoAckInput) {
  const supabase = createAdminClient();
  const templateKey = input.templateKey?.trim() || "gmail_auto_ack";

  const { data: automation } = await supabase
    .from("org_automations")
    .select("is_enabled")
    .eq("organization_id", input.organizationId)
    .eq("service_key", "email-auto-ack")
    .maybeSingle();

  if (!automation?.is_enabled) {
    return { skipped: true, reason: "automation_disabled" as const };
  }

  // Optional exclude domains (newsletter, no-reply, etc.)
  const { data: settingsRow } = await supabase
    .from("org_automation_settings")
    .select("settings")
    .eq("organization_id", input.organizationId)
    .eq("service_key", "email-auto-ack")
    .maybeSingle();

  const settings = (settingsRow?.settings ?? {}) as {
    exclude_domains?: string[];
  };
  const exclude = (settings.exclude_domains ?? []).map((d) =>
    d.toLowerCase().replace(/^@/, "").trim(),
  );
  const toDomain = domainOf(input.toEmail);
  if (exclude.some((d) => d && toDomain === d)) {
    return { skipped: true, reason: "excluded_domain" as const };
  }

  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("organization_id", input.organizationId)
    .eq("template_key", templateKey)
    .maybeSingle();

  if (templateError || !template) {
    throw new Error(
      `No template "${templateKey}" found for this organization. Save it under Templates first.`,
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  const businessName = org?.name ?? "Our team";
  const firstName = input.firstName?.trim() || "there";

  const subject = applyTemplate(template.subject, {
    first_name: firstName,
    business_name: businessName,
  });
  const body = applyTemplate(template.body, {
    first_name: firstName,
    business_name: businessName,
  });

  const accessToken = await getValidGoogleAccessToken(input.organizationId);

  const { data: connection } = await supabase
    .from("connections")
    .select("connected_email")
    .eq("organization_id", input.organizationId)
    .eq("provider", "google")
    .maybeSingle();

  if (!connection?.connected_email) {
    throw new Error("Google is not connected for this organization");
  }

  const rawMessage = [
    `From: ${connection.connected_email}`,
    `To: ${input.toEmail}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    input.inReplyToMessageId
      ? `In-Reply-To: ${input.inReplyToMessageId}`
      : null,
    input.inReplyToMessageId
      ? `References: ${input.inReplyToMessageId}`
      : null,
    "",
    body,
  ]
    .filter(Boolean)
    .join("\r\n");

  const endpoint = input.threadId
    ? `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
    : `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: toBase64Url(rawMessage),
      threadId: input.threadId || undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail send failed: ${errText}`);
  }

  const json = (await res.json()) as { id?: string };

  await supabase.from("email_activity").insert({
    organization_id: input.organizationId,
    service_key: "email-auto-ack",
    direction: "outbound",
    gmail_message_id: json.id ?? null,
    gmail_thread_id: input.threadId ?? null,
    from_email: connection.connected_email,
    to_email: input.toEmail,
    subject,
    status: "sent",
  });

  return { skipped: false as const, messageId: json.id ?? null };
}