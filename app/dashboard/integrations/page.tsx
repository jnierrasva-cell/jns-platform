import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { GoogleDisconnectButton } from "@/components/google-disconnect-button";
import { TwilioConnectCard } from "@/components/twilio-connect-card";
import { ArketaConnectCard } from "@/components/arketa-connect-card";

function mapToText(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  return Object.entries(raw as Record<string, string>)
    .filter(([, v]) => typeof v === "string" && v.includes("@"))
    .map(([k, v]) => `${k} = ${v}`)
    .join("\n");
}

function googleErrorMessage(
  code: string | undefined,
  jnsEmail: string | null,
): string | null {
  if (!code) return null;
  switch (code) {
    case "email_mismatch":
      return jnsEmail
        ? `The Google account you chose does not match your JNS login (${jnsEmail}). Pick that same Google address, or sign in to JNS with the Google account you want to connect.`
        : "The Google account you chose does not match your JNS login email. Use the same address for both.";
    case "not_allowed":
      return "Only the workspace owner or an admin can connect Google.";
    case "invalid_state":
    case "missing_org":
      return "That Google connection link expired. Click Connect Google and try again.";
    case "token_exchange_failed":
      return "Google did not complete the connection. Try again in a moment.";
    case "save_failed":
      return "Google authorized, but we could not save the connection. Try again or contact support.";
    default:
      return "Could not connect Google. Try again.";
  }
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const googleError =
    typeof params.google_error === "string" ? params.google_error : undefined;
  const googleConnected = params.google_connected === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;
  const canManage = active.role === "ceo" || active.role === "admin";
  const jnsEmail = user.email?.trim().toLowerCase() ?? null;

  const admin = createAdminClient();

  const { data: googleConnection } = await admin
    .from("connections")
    .select("connected_email, needs_reauth, last_auth_error")
    .eq("organization_id", orgId)
    .eq("provider", "google")
    .maybeSingle();

  const { data: twilio } = await admin
    .from("twilio_connections")
    .select("from_number")
    .eq("organization_id", orgId)
    .maybeSingle();

  const { data: arketaRows } = await admin
    .from("arketa_locations")
    .select(
      "id, label, partner_id, google_calendar_id, last_synced_at, last_sync_status, last_sync_error, consecutive_failures, timezone, instructor_email_map",
    )
    .eq("organization_id", orgId)
    .order("label", { ascending: true });

  const arketaLocations = (arketaRows ?? []).map((row) => ({
    id: row.id as string,
    label: row.label as string,
    partner_id: row.partner_id as string,
    google_calendar_id: (row.google_calendar_id as string | null) ?? null,
    last_synced_at: (row.last_synced_at as string | null) ?? null,
    last_sync_status: (row.last_sync_status as string | null) ?? null,
    last_sync_error: (row.last_sync_error as string | null) ?? null,
    consecutive_failures: (row.consecutive_failures as number | null) ?? 0,
    timezone: (row.timezone as string | null) ?? "America/Los_Angeles",
    instructor_email_map_text: mapToText(row.instructor_email_map),
    instructor_count: Object.keys(
      (row.instructor_email_map as Record<string, string>) || {},
    ).length,
  }));

  const googleNeedsReauth = Boolean(googleConnection?.needs_reauth);
  const errorText = googleErrorMessage(googleError, jnsEmail);

  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-slate-500">
        Connections
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        Connected accounts
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Connect the tools your automations run on. Each business uses their own
        accounts. Google is the main connection for inbox follow-up; Twilio is
        optional and only needed for SMS.
      </p>

      {errorText && (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          <p className="font-medium">Google connection failed</p>
          <p className="mt-1 text-red-800/90">{errorText}</p>
          {googleError === "email_mismatch" && jnsEmail && (
            <p className="mt-2 text-xs text-red-800/80">
              Tip: on the Google account picker, choose{" "}
              <span className="font-medium">{jnsEmail}</span> — the same email
              you use to sign in to JNS.
            </p>
          )}
        </div>
      )}

      {googleConnected && !errorText && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Google connected successfully. You can turn on inquiry auto-reply in
          Automation.
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Google (Gmail)
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Used for inbox watch, auto-acknowledgment, and calendar sync.
                Connect the same Google address you use to sign in to JNS
                {jnsEmail ? (
                  <>
                    {" "}
                    (<span className="font-medium text-slate-700">{jnsEmail}</span>
                    )
                  </>
                ) : null}
                .
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                googleConnection && !googleNeedsReauth
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : googleNeedsReauth
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200/80 bg-slate-50 text-slate-500"
              }`}
            >
              {googleNeedsReauth
                ? "Reconnect required"
                : googleConnection
                  ? "Connected"
                  : "Not connected"}
            </span>
          </div>

          {googleConnection ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-slate-700">
                Connected as{" "}
                <span className="font-medium text-slate-900">
                  {googleConnection.connected_email}
                </span>
              </p>
              {googleNeedsReauth && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <p className="font-medium">Google access needs to be renewed</p>
                  <p className="mt-0.5 text-xs text-amber-800/90">
                    {(googleConnection.last_auth_error as string | null)?.slice(
                      0,
                      200,
                    ) ||
                      "The refresh token was revoked or expired. Reconnect to restore calendar and Gmail automations."}
                  </p>
                  {canManage && (
                    <a
                      href="/api/google/connect"
                      className="mt-2 inline-flex rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                    >
                      Reconnect Google
                    </a>
                  )}
                </div>
              )}
              {canManage && !googleNeedsReauth && (
                <GoogleDisconnectButton organizationId={orgId} />
              )}
              {canManage && googleNeedsReauth && (
                <GoogleDisconnectButton organizationId={orgId} />
              )}
            </div>
          ) : canManage ? (
            <a
              href="/api/google/connect"
              className="mt-5 inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Connect Google
            </a>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              Ask the workspace owner to connect Google.
            </p>
          )}
        </div>

        <TwilioConnectCard
          organizationId={orgId}
          connected={Boolean(twilio?.from_number)}
          fromNumber={twilio?.from_number ?? null}
          canManage={canManage}
        />

        <ArketaConnectCard
          organizationId={orgId}
          canManage={canManage}
          locations={arketaLocations}
          googleConnectedEmail={
            (googleConnection?.connected_email as string | null) ?? null
          }
        />
      </div>
    </div>
  );
}
