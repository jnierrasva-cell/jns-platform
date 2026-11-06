import { createAdminClient } from "@/lib/supabase/admin";
import {
  TRIAL_DAYS,
  TRIAL_PLAN,
  addDays,
  hasActiveSubscription,
  type OrgBilling,
} from "@/lib/billing/plans";

const TRIAL_PROVIDER = "jns_trial";

/**
 * Whether this workspace already used (or is on) the built-in JNS trial.
 * Paid Lemon / manual grants do not count as using the free trial slot.
 */
export function hasUsedJnsTrial(org: {
  billing_provider?: string | null;
  billing_status?: string | null;
}): boolean {
  return (org.billing_provider || "").toLowerCase() === TRIAL_PROVIDER;
}

/**
 * Start a no-card Pro trial for a brand-new workspace.
 * Safe to call once per org — no-ops if already on a plan, trial, or past trial.
 */
export async function startProTrial(
  organizationId: string,
): Promise<{ started: boolean; endsAt: string | null }> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, plan, billing_status, billing_provider, plan_period_end")
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) return { started: false, endsAt: null };

  const billing: OrgBilling = {
    plan: org.plan,
    billing_status: org.billing_status,
    plan_period_end: org.plan_period_end,
    billing_provider: org.billing_provider,
  };

  // Already entitled (paid, admin grant, or live trial)
  if (hasActiveSubscription(billing)) {
    return { started: false, endsAt: org.plan_period_end };
  }

  // One free trial per workspace
  if (hasUsedJnsTrial(org)) {
    return { started: false, endsAt: null };
  }

  const endsAt = addDays(TRIAL_DAYS).toISOString();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("organizations")
    .update({
      plan: TRIAL_PLAN,
      billing_status: "trialing",
      billing_provider: TRIAL_PROVIDER,
      plan_period_end: endsAt,
      plan_updated_at: now,
      plan_notes: `Auto ${TRIAL_DAYS}-day Pro trial (no card)`,
    })
    .eq("id", organizationId);

  if (error) {
    console.error("[trial] start failed", organizationId, error.message);
    return { started: false, endsAt: null };
  }

  return { started: true, endsAt };
}

/**
 * If the period has ended while status is still active/trialing, mark expired.
 * effectivePlan() already treats past end dates as Free; this keeps the DB honest.
 */
export async function expireTrialIfNeeded(
  organizationId: string,
  billing: OrgBilling,
): Promise<OrgBilling> {
  const status = (billing.billing_status || "none").toLowerCase();
  if (status !== "active" && status !== "trialing") return billing;
  if (!billing.plan_period_end) return billing;

  const end = new Date(billing.plan_period_end).getTime();
  if (Number.isNaN(end) || end > Date.now()) return billing;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("organizations")
    .update({
      billing_status: "expired",
      plan_updated_at: now,
    })
    .eq("id", organizationId)
    .in("billing_status", ["active", "trialing"]);

  if (error) {
    console.error("[trial] expire failed", organizationId, error.message);
    return billing;
  }

  return {
    ...billing,
    billing_status: "expired",
  };
}
