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
      <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
        Overview
      </span>
      <h1 className="text-2xl font-medium text-[#1B1D1F]">
        Welcome back
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/automation"
          className="rounded-lg border border-[#E1DFD6] bg-white p-5 transition-colors hover:border-[#B9C4BF]"
        >
          <p className="text-2xl font-medium text-[#1B1D1F]">
            {activeAutomations}
          </p>
          <p className="mt-1 text-sm text-[#6B7069]">
            of {mockServices.length} automations active
          </p>
        </Link>

        <Link
          href="/dashboard/integrations"
          className="rounded-lg border border-[#E1DFD6] bg-white p-5 transition-colors hover:border-[#B9C4BF]"
        >
          <p className="text-2xl font-medium text-[#1B1D1F]">
            {googleConnection ? "1" : "0"}
          </p>
          <p className="mt-1 text-sm text-[#6B7069]">
            {googleConnection
              ? `Google connected (${googleConnection.connected_email})`
              : "integrations connected"}
          </p>
        </Link>

        <Link
          href="/dashboard/team"
          className="rounded-lg border border-[#E1DFD6] bg-white p-5 transition-colors hover:border-[#B9C4BF]"
        >
          <p className="text-2xl font-medium text-[#1B1D1F]">
            {teamCount ?? 1}
          </p>
          <p className="mt-1 text-sm text-[#6B7069]">team members</p>
        </Link>
      </div>
    </div>
  );
}