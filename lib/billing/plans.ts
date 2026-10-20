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
};

/** What each plan is allowed to use (enforce gradually). */
export const PLAN_LIMITS = {
  none: {
    label: "No plan",
    maxUsers: 1,
    emailAutomation: false,
    emailRules: false,
    teamInvites: false,
    customForms: false,
    smsReminders: false,
  },
  starter: {
    label: "Starter",
    maxUsers: 2,
    emailAutomation: false,
    emailRules: false,
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

export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === "starter" || plan === "pro" || plan === "business") return plan;
  return "none";
}

/** Active access: status ok AND (no end date OR end date still in the future). */
export function hasActiveSubscription(org: OrgBilling): boolean {
  const status = (org.billing_status || "none").toLowerCase();
  if (status !== "active" && status !== "trialing") return false;

  if (!org.plan_period_end) return true; // open-ended (admin grant)
  const end = new Date(org.plan_period_end).getTime();
  if (Number.isNaN(end)) return true;
  return end > Date.now();
}

export function effectivePlan(org: OrgBilling): PlanId {
  if (!hasActiveSubscription(org)) return "none";
  return normalizePlan(org.plan);
}

export function planLimits(org: OrgBilling) {
  return PLAN_LIMITS[effectivePlan(org)];
}

/** Default monthly period end from now. */
export function addOneMonth(from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}