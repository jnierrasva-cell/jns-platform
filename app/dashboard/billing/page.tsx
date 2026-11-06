import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { isOrgManagerRole } from "@/lib/org/roles";
import {
  daysRemaining,
  effectivePlan,
  hasActiveSubscription,
  isTrialing,
  PLAN_LIMITS,
  normalizePlan,
  type OrgBilling,
} from "@/lib/billing/plans";
import { expireTrialIfNeeded } from "@/lib/billing/trial";
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

  let billing: OrgBilling = {
    plan: org?.plan ?? "none",
    billing_status: org?.billing_status ?? "none",
    plan_period_end: org?.plan_period_end ?? null,
    billing_provider: org?.billing_provider ?? null,
  };

  billing = await expireTrialIfNeeded(active.organizationId, billing);

  const current = effectivePlan(billing);
  const limits = PLAN_LIMITS[current];
  const canManage = isOrgManagerRole(active.role);
  const trial = isTrialing(billing);

  return (
    <BillingClient
      orgName={org?.name || active.orgName || "Workspace"}
      organizationId={active.organizationId}
      canManage={canManage}
      plan={normalizePlan(org?.plan)}
      billingStatus={billing.billing_status || "none"}
      periodEnd={billing.plan_period_end}
      provider={billing.billing_provider ?? null}
      effectivePlan={current}
      planLabel={trial ? "Pro trial" : limits.label}
      isActive={hasActiveSubscription(billing)}
      isTrial={trial}
      daysLeft={daysRemaining(billing)}
    />
  );
}
