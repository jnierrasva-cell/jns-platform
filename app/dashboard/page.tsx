import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { mockServices } from "@/lib/mock-services";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const orgId = membership?.organization_id;

  const { data: googleConnection } = await supabase
    .from("connections")
    .select("connected_email")
    .eq("organization_id", orgId)
    .eq("provider", "google")
    .maybeSingle();

  const { count: teamCount } = await supabase
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  const activeAutomations = mockServices.filter(
    (s) => s.status === "active",
  ).length;

  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        Overview
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Welcome back
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/automation"
          className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-[#2563EB]/40 hover:bg-white/[0.05]"
        >
          <p className="font-[family-name:var(--font-poppins)] text-3xl font-semibold text-white">
            {activeAutomations}
          </p>
          <p className="mt-1.5 text-sm text-[#94A3B8]">
            of {mockServices.length} automations active
          </p>
        </Link>

        <Link
          href="/dashboard/integrations"
          className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-[#2563EB]/40 hover:bg-white/[0.05]"
        >
          <p className="font-[family-name:var(--font-poppins)] text-3xl font-semibold text-white">
            {googleConnection ? "1" : "0"}
          </p>
          <p className="mt-1.5 text-sm text-[#94A3B8]">
            {googleConnection
              ? `Google connected (${googleConnection.connected_email})`
              : "integrations connected"}
          </p>
        </Link>

        <Link
          href="/dashboard/team"
          className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-[#2563EB]/40 hover:bg-white/[0.05]"
        >
          <p className="font-[family-name:var(--font-poppins)] text-3xl font-semibold text-white">
            {teamCount ?? 1}
          </p>
          <p className="mt-1.5 text-sm text-[#94A3B8]">team members</p>
        </Link>
      </div>
    </div>
  );
}