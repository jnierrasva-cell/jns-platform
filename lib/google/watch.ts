import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidGoogleAccessToken } from "@/lib/google/token";

/**
 * Starts a Gmail watch for the org and stores history_id + expiration.
 * Watch lasts ~7 days; must be renewed via cron.
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
  const expiration = data.expiration
    ? new Date(Number(data.expiration)).toISOString()
    : null;

  // Prefer admin so this works from OAuth callback and cron (no user cookie)
  const admin = createAdminClient();
  const { error } = await admin
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
  try {
    const { accessToken } = await getValidGoogleAccessToken(organizationId);
    await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (err) {
    console.error("[gmail-watch] stop failed", err);
  }

  const admin = createAdminClient();
  await admin
    .from("connections")
    .update({
      watch_expiration: null,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("provider", "google");
}

/**
 * Renew watches that expire within `withinHours` (default 48).
 * Returns counts for cron logging.
 */
export async function renewExpiringGmailWatches(withinHours = 48) {
  const admin = createAdminClient();
  const cutoff = new Date(
    Date.now() + withinHours * 60 * 60 * 1000,
  ).toISOString();

  const { data: rows, error } = await admin
    .from("connections")
    .select("organization_id, watch_expiration, needs_reauth")
    .eq("provider", "google")
    .not("connected_email", "is", null);

  if (error) {
    throw new Error(`Failed to list Google connections: ${error.message}`);
  }

  let renewed = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { organizationId: string; error: string }[] = [];

  for (const row of rows ?? []) {
    const orgId = row.organization_id as string;
    if (row.needs_reauth) {
      skipped += 1;
      continue;
    }

    const exp = row.watch_expiration as string | null;
    const needsRenew =
      !exp || Number.isNaN(new Date(exp).getTime()) || exp <= cutoff;

    if (!needsRenew) {
      skipped += 1;
      continue;
    }

    try {
      await startGmailWatch(orgId);
      renewed += 1;
    } catch (err) {
      failed += 1;
      errors.push({
        organizationId: orgId,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error("[gmail-watch] renew failed", orgId, err);
    }
  }

  return { renewed, skipped, failed, errors };
}
