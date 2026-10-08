import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { disconnectGoogle } from "@/app/dashboard/integrations/actions";
import { TwilioConnectCard } from "@/components/twilio-connect-card";
import { ArketaConnectCard } from "@/components/arketa-connect-card";

function mapToText(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  return Object.entries(raw as Record<string, string>)
    .filter(([, v]) => typeof v === "string" && v.includes("@"))
    .map(([k, v]) => `${k} = ${v}`)
    .join("\n");
}

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;
  const canManage = active.role === "ceo" || active.role === "admin";

  const admin = createAdminClient();

  const { data: googleConnection } = await admin
    .from("connections")
    .select("connected_email")
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
      "id, label, partner_id, google_calendar_id, last_synced_at, last_sync_status, instructor_email_map",
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
    instructor_email_map_text: mapToText(row.instructor_email_map),
    instructor_count: Object.keys(
      (row.instructor_email_map as Record<string, string>) || {},
    ).length,
  }));

  const disconnectGoogleAction = disconnectGoogle.bind(null, orgId);

  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-500">
        Integrations
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Connected accounts
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Connect the tools your automations run on. Each business uses their own
        accounts.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Google (Gmail)
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Used for inbox watch, auto-acknowledgment, and calendar sync.
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                googleConnection
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500"
              }`}
            >
              {googleConnection ? "Connected" : "Not connected"}
            </span>
          </div>

          {googleConnection ? (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-zinc-700">
                Connected as{" "}
                <span className="font-medium text-zinc-900">
                  {googleConnection.connected_email}
                </span>
              </p>
              {canManage && (
                <form action={disconnectGoogleAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900"
                  >
                    Disconnect Google
                  </button>
                </form>
              )}
            </div>
          ) : canManage ? (
            <a
              href="/api/google/connect"
              className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Connect Google
            </a>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">
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
        />
      </div>
    </div>
  );
}
