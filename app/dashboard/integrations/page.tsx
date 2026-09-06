import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { disconnectGoogle } from "@/app/dashboard/integrations/actions";
import { TwilioConnectCard } from "@/components/twilio-connect-card";

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
  const canManage = membership.role === "ceo";

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

  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        Integrations
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Connected accounts
      </h1>
      <p className="mt-1 text-sm text-[#94A3B8]">
        Connect the tools your automations run on. Each business uses their own
        accounts.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Google */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-poppins)] text-base font-semibold text-white">
                Google (Gmail)
              </h2>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Used for inbox watch and auto-acknowledgment replies.
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                googleConnection
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.04] text-[#94A3B8]"
              }`}
            >
              {googleConnection ? "Connected" : "Not connected"}
            </span>
          </div>

          {googleConnection ? (
            <div className="mt-5">
              <p className="text-sm text-[#E2E8F0]">
                Connected as{" "}
                <span className="font-medium text-white">
                  {googleConnection.connected_email}
                </span>
              </p>
              {canManage && (
                <form
                  action={async () => {
                    "use server";
                    await disconnectGoogle(orgId);
                  }}
                  className="mt-4"
                >
                  <button
                    type="submit"
                    className="rounded-lg border border-white/15 px-3 py-2 text-xs text-[#94A3B8] transition hover:border-white/25 hover:text-white"
                  >
                    Disconnect Google
                  </button>
                </form>
              )}
            </div>
          ) : canManage ? (
            <a
              href="/api/google/connect"
              className="mt-5 inline-flex rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8]"
            >
              Connect Google
            </a>
          ) : (
            <p className="mt-5 text-sm text-[#94A3B8]">
              Ask the workspace owner to connect Google.
            </p>
          )}
        </div>

        {/* Twilio */}
        <TwilioConnectCard
          organizationId={orgId}
          connected={Boolean(twilio)}
          fromNumber={twilio?.from_number ?? null}
          canManage={canManage}
        />
      </div>
    </div>
  );
}