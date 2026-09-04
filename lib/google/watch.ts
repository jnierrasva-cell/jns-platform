import { createClient } from "@/lib/supabase/server";
import { getValidGoogleAccessToken } from "@/lib/google/token";

/**
 * Starts a Gmail watch for the org and stores history_id + expiration.
 * Watch lasts ~7 days; must be renewed.
 */
export async function startGmailWatch(organizationId: string) {
  const topic = process.env.GOOGLE_PUBSUB_TOPIC;
  if (!topic) {
    throw new Error("GOOGLE_PUBSUB_TOPIC is not set");
  }

  const { accessToken } = await getValidGoogleAccessToken(organizationId);

  const watchRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName: topic,
        labelIds: ["INBOX"],
      }),
    },
  );

  if (!watchRes.ok) {
    const err = await watchRes.text();
    throw new Error(`Failed to start Gmail watch: ${err}`);
  }

  const data = await watchRes.json();
  // data.historyId, data.expiration (ms since epoch as string)

  const supabase = await createClient();
  const expiration = data.expiration
    ? new Date(Number(data.expiration)).toISOString()
    : null;

  const { error } = await supabase
    .from("connections")
    .update({
      history_id: String(data.historyId),
      watch_expiration: expiration,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("provider", "google");

  if (error) {
    throw new Error(`Failed to save watch state: ${error.message}`);
  }

  return {
    historyId: String(data.historyId),
    expiration,
  };
}

/**
 * Stops Gmail push notifications for the connected account.
 */
export async function stopGmailWatch(organizationId: string) {
  const { accessToken } = await getValidGoogleAccessToken(organizationId);

  await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const supabase = await createClient();
  await supabase
    .from("connections")
    .update({
      watch_expiration: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("provider", "google");
}