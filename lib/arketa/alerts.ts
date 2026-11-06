import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/email/resend";
import { log } from "@/lib/log";

/** Alert org managers after this many consecutive hard failures. */
export const ARKETA_ALERT_THRESHOLD = 2;

async function resolveManagerEmails(organizationId: string): Promise<string[]> {
  const admin = createAdminClient();
  const emails = new Set<string>();

  const { data: members } = await admin
    .from("org_members")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .in("role", ["ceo", "admin"]);

  const userIds = (members ?? []).map((m) => m.user_id as string);

  // Prefer auth.users via service role
  for (const uid of userIds) {
    try {
      const { data, error } = await admin.auth.admin.getUserById(uid);
      if (!error && data.user?.email) {
        emails.add(data.user.email.toLowerCase());
      }
    } catch {
      // continue
    }
  }

  if (emails.size === 0) {
    const { data: google } = await admin
      .from("connections")
      .select("connected_email")
      .eq("organization_id", organizationId)
      .eq("provider", "google")
      .maybeSingle();
    if (google?.connected_email) {
      emails.add(String(google.connected_email).toLowerCase());
    }
  }

  return Array.from(emails);
}

/**
 * Email ceo/admin members when consecutive failures first cross the threshold.
 * Dedupes with last_failure_alert_at so we do not spam every cron tick.
 */
export async function maybeAlertArketaSyncFailure(input: {
  organizationId: string;
  locationId: string;
  locationLabel: string;
  consecutiveFailures: number;
  errorMessage: string;
}): Promise<void> {
  if (input.consecutiveFailures < ARKETA_ALERT_THRESHOLD) return;

  const admin = createAdminClient();

  const { data: loc } = await admin
    .from("arketa_locations")
    .select("last_failure_alert_at")
    .eq("id", input.locationId)
    .maybeSingle();

  const lastAlert = loc?.last_failure_alert_at
    ? new Date(loc.last_failure_alert_at as string).getTime()
    : 0;
  const hoursSinceAlert = lastAlert
    ? (Date.now() - lastAlert) / (1000 * 60 * 60)
    : Infinity;

  const shouldAlert =
    input.consecutiveFailures === ARKETA_ALERT_THRESHOLD ||
    (input.consecutiveFailures > ARKETA_ALERT_THRESHOLD && hoursSinceAlert >= 24);

  if (!shouldAlert) return;

  const emails = await resolveManagerEmails(input.organizationId);
  if (emails.length === 0) {
    log.warn("arketa-alert", "no manager emails to notify", {
      organizationId: input.organizationId,
      locationId: input.locationId,
    });
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://jnsystem.app";

  const text = [
    `Arketa → Google Calendar sync failed for “${input.locationLabel}”.`,
    "",
    `Consecutive failures: ${input.consecutiveFailures}`,
    `Error: ${input.errorMessage.slice(0, 400)}`,
    "",
    `Open Integrations to review and run Sync now:`,
    `${appUrl}/dashboard/integrations`,
    "",
    "— JNS",
  ].join("\n");

  const result = await sendResendEmail({
    to: emails,
    subject: `[JNS] Arketa sync needs attention: ${input.locationLabel}`,
    text,
  });

  if (result.ok) {
    await admin
      .from("arketa_locations")
      .update({
        last_failure_alert_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.locationId);
    log.info("arketa-alert", "failure email sent", {
      organizationId: input.organizationId,
      locationId: input.locationId,
      recipients: emails.length,
    });
  } else {
    log.warn("arketa-alert", "email not sent", {
      organizationId: input.organizationId,
      locationId: input.locationId,
      error: result.error,
    });
  }
}
