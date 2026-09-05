import { createAdminClient } from "@/lib/supabase/admin";
import { getValidGoogleAccessToken } from "@/lib/google/token";
import { sendAutoAck } from "@/lib/google/send-auto-ack";

type PubSubEmailNotification = {
  emailAddress: string;
  historyId: number | string;
};

function decodePubSubData(data: string): PubSubEmailNotification {
  const json = Buffer.from(data, "base64").toString("utf8");
  return JSON.parse(json) as PubSubEmailNotification;
}

export async function processGmailNotification(pubsubDataBase64: string) {
  const notification = decodePubSubData(pubsubDataBase64);
  const emailAddress = notification.emailAddress?.toLowerCase();

  console.log("[gmail-webhook] notification", {
    emailAddress,
    historyId: notification.historyId,
  });

  if (!emailAddress) {
    return { ok: false, reason: "missing_email" as const };
  }

  const supabase = createAdminClient();

  const { data: connection, error: connError } = await supabase
    .from("connections")
    .select("organization_id, history_id, connected_email")
    .eq("provider", "google")
    .ilike("connected_email", emailAddress)
    .maybeSingle();

  if (connError) {
    console.error("[gmail-webhook] connection lookup error", connError);
    return { ok: false, reason: "connection_error" as const };
  }

  if (!connection) {
    console.log("[gmail-webhook] unknown_account", emailAddress);
    return { ok: false, reason: "unknown_account" as const };
  }

  const organizationId = connection.organization_id as string;

  const { data: automation } = await supabase
    .from("org_automations")
    .select("is_enabled")
    .eq("organization_id", organizationId)
    .eq("service_key", "email-auto-ack")
    .maybeSingle();

  if (!automation?.is_enabled) {
    console.log("[gmail-webhook] automation_off", organizationId);
    return { ok: true, skipped: true, reason: "automation_off" as const };
  }

  const startHistoryId = connection.history_id;
  if (!startHistoryId) {
    await supabase
      .from("connections")
      .update({
        history_id: String(notification.historyId),
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      .eq("provider", "google");

    return { ok: true, skipped: true, reason: "no_baseline" as const };
  }

  const { accessToken } = await getValidGoogleAccessToken(organizationId);

  const historyUrl = new URL(
    "https://gmail.googleapis.com/gmail/v1/users/me/history",
  );
  historyUrl.searchParams.set("startHistoryId", String(startHistoryId));
  historyUrl.searchParams.set("historyTypes", "messageAdded");
  historyUrl.searchParams.set("labelId", "INBOX");

  const historyRes = await fetch(historyUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!historyRes.ok) {
    const err = await historyRes.text();
    if (historyRes.status === 404) {
      await supabase
        .from("connections")
        .update({
          history_id: String(notification.historyId),
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", organizationId)
        .eq("provider", "google");
      return { ok: true, skipped: true, reason: "history_reset" as const };
    }
    throw new Error(`History API failed: ${err}`);
  }

  const historyData = await historyRes.json();
  const histories = historyData.history ?? [];

  const messageIds = new Set<string>();
  for (const h of histories) {
    for (const added of h.messagesAdded ?? []) {
      if (added.message?.id) messageIds.add(added.message.id);
    }
  }

  console.log("[gmail-webhook] new message ids", [...messageIds]);

  let sentCount = 0;

  for (const messageId of messageIds) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!msgRes.ok) continue;
    const msg = await msgRes.json();

    const labelIds: string[] = msg.labelIds ?? [];
    if (labelIds.includes("SENT")) continue;

    const headers = msg.payload?.headers ?? [];
    const fromHeader =
      headers.find(
        (h: { name: string; value: string }) =>
          h.name.toLowerCase() === "from",
      )?.value ?? "";
    const subject =
      headers.find(
        (h: { name: string; value: string }) =>
          h.name.toLowerCase() === "subject",
      )?.value ?? "";
    const messageIdHeader =
      headers.find(
        (h: { name: string; value: string }) =>
          h.name.toLowerCase() === "message-id",
      )?.value ?? undefined;

    const fromMatch = fromHeader.match(/<([^>]+)>/);
    const fromEmail = (fromMatch?.[1] ?? fromHeader).trim().toLowerCase();

    if (!fromEmail || fromEmail === connection.connected_email?.toLowerCase()) {
      continue;
    }

    const { data: existing } = await supabase
      .from("email_activity")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("gmail_message_id", messageId)
      .maybeSingle();

    if (existing) continue;

    await supabase.from("email_activity").insert({
      organization_id: organizationId,
      service_key: "email-auto-ack",
      direction: "inbound",
      gmail_message_id: messageId,
      gmail_thread_id: msg.threadId ?? null,
      from_email: fromEmail,
      to_email: connection.connected_email,
      subject,
      status: "received",
    });

    const firstName =
      fromHeader.split(" ")[0]?.replace(/[^a-zA-Z]/g, "") || "there";

    await sendAutoAck({
      organizationId,
      toEmail: fromEmail,
      threadId: msg.threadId,
      inReplyToMessageId: messageIdHeader,
      firstName,
    });

    sentCount += 1;
  }

  await supabase
    .from("connections")
    .update({
      history_id: String(notification.historyId),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("provider", "google");

  console.log("[gmail-webhook] done", { sentCount });
  return { ok: true, sentCount };
}