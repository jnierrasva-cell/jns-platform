import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { isOrgManagerRole } from "@/lib/org/roles";
import {
  effectivePlan,
  hasActiveSubscription,
  PLAN_LIMITS,
  normalizePlan,
} from "@/lib/billing/plans";
import { BillingClient } from "@/components/billing-client";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/dashboard/orgs");

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select(
      "id, name, plan, billing_status, billing_provider, plan_period_end",
    )
    .eq("id", active.organizationId)
    .maybeSingle();

  const billing = {
    plan: org?.plan ?? "none",
    billing_status: org?.billing_status ?? "none",
    plan_period_end: org?.plan_period_end ?? null,
  };

  const current = effectivePlan(billing);
  const limits = PLAN_LIMITS[current];
  const canManage = isOrgManagerRole(active.role);

  return (
    <BillingClient
      orgName={org?.name || active.orgName || "Workspace"}
      organizationId={active.organizationId}
      canManage={canManage}
      plan={normalizePlan(org?.plan)}
      billingStatus={org?.billing_status || "none"}
      periodEnd={org?.plan_period_end}
      provider={org?.billing_provider}
      effectivePlan={current}
      planLabel={limits.label}
      isActive={hasActiveSubscription(billing)}
    />
  );
}