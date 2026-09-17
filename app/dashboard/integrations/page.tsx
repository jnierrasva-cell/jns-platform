import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { disconnectGoogle } from "@/app/dashboard/integrations/actions";
import { TwilioConnectCard } from "@/components/twilio-connect-card";
import { ArketaConnectCard } from "@/components/arketa-connect-card";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding/setup-business");

  const orgId = membership.organization_id;
  const canManage =
    membership.role === "ceo" || membership.role === "admin";

  const { data: googleConnection } = await supabase
    .from("connections")
    .select("connected_email")
    .eq("organization_id", orgId)
    .eq("provider", "google")
    .maybeSingle();

  const { data: twilio } = await supabase
    .from("twilio_connections")
    .select("from_number")
    .eq("organization_id", orgId)
    .maybeSingle();

  const { data: arketaLocations } = await supabase
    .from("arketa_locations")
    .select(
      "id, label, partner_id, google_calendar_id, last_synced_at, last_sync_status",
    )
    .eq("organization_id", orgId)
    .order("label", { ascending: true });

  // Form actions must accept FormData — bind org id for disconnect
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
        {/* Google */}
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
              className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white  transition hover:bg-zinc-800"
            >
              Connect Google
            </a>
          ) : (
            <p className="mt-5 text-sm text-zinc-500">
              Ask the workspace owner to connect Google.
            </p>
          )}
        </div>

        {/* Twilio — match existing prop names */}
        <TwilioConnectCard
          organizationId={orgId}
          connected={Boolean(twilio?.from_number)}
          fromNumber={twilio?.from_number ?? null}
          canManage={canManage}
        />

        {/* Arketa — full width */}
        <ArketaConnectCard
          organizationId={orgId}
          canManage={canManage}
          locations={arketaLocations ?? []}
        />
      </div>
    </div>
  );
}