import { createAdminClient } from "@/lib/supabase/admin";
import { getValidGoogleAccessToken } from "@/lib/google/token";

function toBase64Url(str: string) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmailMessage(input: {
  organizationId: string;
  toEmail: string;
  subject: string;
  body: string;
  contactId?: string;
}) {
  const supabase = createAdminClient();
  const toEmail = input.toEmail.trim().toLowerCase();
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!toEmail.includes("@")) throw new Error("Invalid recipient email");
  if (!subject) throw new Error("Subject is required");
  if (!body) throw new Error("Message body is required");

  const { accessToken, connectedEmail } = await getValidGoogleAccessToken(
    input.organizationId,
  );

  if (!connectedEmail) {
    throw new Error("Connected Google account has no email");
  }

  const rawMessage = [
    `From: ${connectedEmail}`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    body,
  ].join("\r\n");

  const sendRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: toBase64Url(rawMessage) }),
    },
  );

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    await supabase.from("email_activity").insert({
      organization_id: input.organizationId,
      contact_id: input.contactId ?? null,
      service_key: "manual_email",
      direction: "outbound",
      to_email: toEmail,
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
    contact_id: input.contactId ?? null,
    service_key: "manual_email",
    direction: "outbound",
    gmail_message_id: sent.id ?? null,
    gmail_thread_id: sent.threadId ?? null,
    to_email: toEmail,
    from_email: connectedEmail,
    subject,
    status: "sent",
  });

  return { messageId: sent.id as string };
}