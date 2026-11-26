export type PlanId = "none" | "starter" | "pro" | "business";

export type BillingStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "expired";

export type OrgBilling = {
  plan: string | null;
  billing_status: string | null;
  plan_period_end: string | null;
  billing_provider?: string | null;
};

/** New workspaces get a no-card Pro trial for this many days. */
export const TRIAL_DAYS = 14;

/** Trial unlocks the same feature set as this paid plan. */
export const TRIAL_PLAN: PlanId = "pro";

/**
 * Days a past_due subscription keeps paid access after plan_period_end.
 * Covers card retry windows without locking a paying team out immediately.
 */
export const PAST_DUE_GRACE_DAYS = 3;

/**
 * Feature gates by effective plan.
 *
 * Always available (not gated here): contacts, pipeline, notes, bookings,
 * public booking page, core forms, CSV, Google Calendar connect, SOPs owner.
 *
 * none     = free forever after trial ends (or never started)
 * starter  = paid $35
 * pro      = paid $89 (also used while trialing)
 * business = paid $179
 */
export const PLAN_LIMITS = {
  none: {
    label: "Free",
    maxUsers: 1,
    emailAutomation: true,
    emailRules: true,
    teamInvites: false,
    customForms: false,
    smsReminders: false,
  },
  starter: {
    label: "Starter",
    maxUsers: 2,
    emailAutomation: true,
    emailRules: true,
    teamInvites: true,
    customForms: true,
    smsReminders: false,
  },
  pro: {
    label: "Pro",
    maxUsers: 10,
    emailAutomation: true,
    emailRules: true,
    teamInvites: true,
    customForms: true,
    smsReminders: true,
  },
  business: {
    label: "Business",
    maxUsers: 25,
    emailAutomation: true,
    emailRules: true,
    teamInvites: true,
    customForms: true,
    smsReminders: true,
  },
} as const;

export type PlanLimits = (typeof PLAN_LIMITS)[PlanId];

export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === "starter" || plan === "pro" || plan === "business") return plan;
  return "none";
}

function parsePeriodEndMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return null;
  return end;
}

/**
 * Active access:
 * - active / trialing with no end date (admin grant) or future end date
 * - past_due within grace after period end (payment retry window)
 * Invalid period-end strings fail closed (no silent permanent access).
 */
export function hasActiveSubscription(org: OrgBilling): boolean {
  const status = (org.billing_status || "none").toLowerCase();
  const endMs = parsePeriodEndMs(org.plan_period_end);

  if (org.plan_period_end && endMs === null) {
    // Malformed date must not grant access indefinitely.
    console.error(
      "[billing] invalid plan_period_end — denying paid access",
      org.plan_period_end,
    );
    return false;
  }

  if (status === "active" || status === "trialing") {
    if (endMs === null) return true; // open-ended admin grant
    return endMs > Date.now();
  }

  if (status === "past_due") {
    // Still inside the paid period, or within post-period grace.
    if (endMs === null) return true;
    const graceMs = PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() <= endMs + graceMs;
  }

  return false;
}

export function effectivePlan(org: OrgBilling): PlanId {
  if (!hasActiveSubscription(org)) return "none";
  return normalizePlan(org.plan);
}

export function planLimits(org: OrgBilling): PlanLimits {
  return PLAN_LIMITS[effectivePlan(org)];
}

export function isTrialing(org: OrgBilling): boolean {
  return (
    (org.billing_status || "").toLowerCase() === "trialing" &&
    hasActiveSubscription(org)
  );
}

/** Days remaining on trial/subscription period (ceil). Null if no end date. */
export function daysRemaining(org: OrgBilling): number | null {
  const endMs = parsePeriodEndMs(org.plan_period_end);
  if (endMs === null) return null;
  const ms = endMs - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** Default monthly period end from now. */
export function addOneMonth(from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

export function addDays(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}
