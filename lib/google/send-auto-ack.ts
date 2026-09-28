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

/**
 * Sends an org email template via Gmail.
 * templateKey defaults to gmail_auto_ack.
 * Respects exclude_domains in org_automation_settings for email-auto-ack.
 */
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

  const { data: settingsRow } = await supabase
    .from("org_automation_settings")
    .select("settings")
    .eq("organization_id", input.organizationId)
    .eq("service_key", "email-auto-ack")
    .maybeSingle();

  const settings = (settingsRow?.settings ?? {}) as {
    exclude_domains?: string[];
  };
  const exclude = (settings.exclude_domains ?? [])
    .map((d) => d.toLowerCase().replace(/^@/, "").trim())
    .filter(Boolean);
  if (exclude.includes(domainOf(input.toEmail))) {
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
      `No template "${templateKey}" found. Save it under Templates first.`,
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

  const { accessToken, connectedEmail } = await getValidGoogleAccessToken(
    input.organizationId,
  );

  if (!connectedEmail) {
    throw new Error("Connected Google account has no email");
  }

  const headers = [
    `From: ${connectedEmail}`,
    `To: ${input.toEmail}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ];

  if (input.inReplyToMessageId) {
    headers.push(`In-Reply-To: ${input.inReplyToMessageId}`);
    headers.push(`References: ${input.inReplyToMessageId}`);
  }

  const rawMessage = `\( {headers.join("\r\n")}\r\n\r\n \){body}`;
  const raw = toBase64Url(rawMessage);

  const payload: { raw: string; threadId?: string } = { raw };
  if (input.threadId) payload.threadId = input.threadId;

  const sendRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!sendRes.ok) {
    const errText = await sendRes.text();

    await supabase.from("email_activity").insert({
      organization_id: input.organizationId,
      service_key: "email-auto-ack",
      direction: "outbound",
      to_email: input.toEmail,
      from_email: connectedEmail,
      subject,
      status: "failed",
      error_message: errText,
    });

    throw new Error(`Gmail send failed: ${errText}`);
  }

  const sent = await sendRes.json();

  await supabase.from("email_activity").insert({
    organization_id: input.organizationId,
    service_key: "email-auto-ack",
    direction: "outbound",
    gmail_message_id: sent.id ?? null,
    gmail_thread_id: sent.threadId ?? input.threadId ?? null,
    to_email: input.toEmail,
    from_email: connectedEmail,
    subject,
    status: "sent",
  });

  return {
    skipped: false as const,
    messageId: sent.id as string,
    threadId: sent.threadId as string | undefined,
  };
}