import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { OrgsClient } from "@/components/orgs-client";
import {
  effectivePlan,
  isTrialing,
  PLAN_LIMITS,
  type OrgBilling,
} from "@/lib/billing/plans";
import { MAX_WORKSPACES_PER_USER } from "@/lib/org/workspace-limits";

export default async function OrgsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveOrg();

  const { data: memberships } = await supabase
    .from("org_members")
    .select(
      "organization_id, role, organizations(id, name, kind, logo_url, plan, billing_status, plan_period_end, billing_provider)",
    )
    .eq("user_id", user.id);

  const orgs = (memberships ?? []).map((m) => {
    const org = Array.isArray(m.organizations)
      ? m.organizations[0]
      : m.organizations;
    const row = org as {
      name?: string;
      kind?: string;
      logo_url?: string | null;
      plan?: string | null;
      billing_status?: string | null;
      plan_period_end?: string | null;
      billing_provider?: string | null;
    } | null;

    const billing: OrgBilling = {
      plan: row?.plan ?? null,
      billing_status: row?.billing_status ?? null,
      plan_period_end: row?.plan_period_end ?? null,
      billing_provider: row?.billing_provider ?? null,
    };
    const planId = effectivePlan(billing);
    const planLabel = isTrialing(billing)
      ? "Pro trial"
      : PLAN_LIMITS[planId].label;

    return {
      id: m.organization_id as string,
      name: row?.name ?? "Workspace",
      role: m.role as string,
      kind: row?.kind === "business" ? ("business" as const) : ("personal" as const),
      logoUrl: row?.logo_url ?? null,
      planLabel,
      isActive: m.organization_id === active?.organizationId,
    };
  });

  return (
    <OrgsClient
      orgs={orgs}
      maxWorkspaces={MAX_WORKSPACES_PER_USER}
      canCreate={orgs.length < MAX_WORKSPACES_PER_USER}
    />
  );
}
