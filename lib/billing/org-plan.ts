import { createAdminClient } from "@/lib/supabase/admin";
import {
  effectivePlan,
  planLimits,
  type OrgBilling,
  type PlanId,
} from "@/lib/billing/plans";

export async function getOrgBilling(
  organizationId: string,
): Promise<OrgBilling & { planId: PlanId }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("plan, billing_status, plan_period_end")
    .eq("id", organizationId)
    .maybeSingle();

  const billing: OrgBilling = {
    plan: data?.plan ?? "none",
    billing_status: data?.billing_status ?? "none",
    plan_period_end: data?.plan_period_end ?? null,
  };

  return { ...billing, planId: effectivePlan(billing) };
}

function upgradeMessage(need: string) {
  return `${need} Upgrade under Billing (sidebar → Billing), or ask the platform owner to assign a plan.`;
}

/** Email rules + unmatched routing */
export async function assertEmailRules(organizationId: string) {
  const billing = await getOrgBilling(organizationId);
  const limits = planLimits(billing);
  if (!limits.emailRules) {
    throw new Error(
      upgradeMessage("Email rules require Pro or Business."),
    );
  }
}

/** Auto-reply / inbox automations */
export async function assertEmailAutomation(organizationId: string) {
  const billing = await getOrgBilling(organizationId);
  const limits = planLimits(billing);
  if (!limits.emailAutomation) {
    throw new Error(
      upgradeMessage("Email automation requires Pro or Business."),
    );
  }
}

/** SMS reminders */
export async function assertSmsReminders(organizationId: string) {
  const billing = await getOrgBilling(organizationId);
  const limits = planLimits(billing);
  if (!limits.smsReminders) {
    throw new Error(
      upgradeMessage("SMS reminders require Pro or Business."),
    );
  }
}

/**
 * Team invites: plan must allow invites, and members + pending invites
 * must stay under maxUsers.
 */
export async function assertCanInvite(
  organizationId: string,
): Promise<void> {
  const billing = await getOrgBilling(organizationId);
  const limits = planLimits(billing);

  if (!limits.teamInvites) {
    throw new Error(
      upgradeMessage("Team invites require Starter, Pro, or Business."),
    );
  }

  const admin = createAdminClient();

  const { count: memberCount } = await admin
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const { count: pendingCount } = await admin
    .from("invites")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  const used = (memberCount ?? 0) + (pendingCount ?? 0);
  if (used >= limits.maxUsers) {
    throw new Error(
      `This workspace is at the seat limit (${limits.maxUsers}) for the ${limits.label} plan. Upgrade under Billing for more seats.`,
    );
  }
}

export async function getPlanGateState(organizationId: string) {
  const billing = await getOrgBilling(organizationId);
  const limits = planLimits(billing);
  return {
    planId: effectivePlan(billing),
    limits,
    billing,
  };
}