"use client";

import { Check, Minus } from "lucide-react";
import { PricingCheckoutButton } from "@/components/pricing-checkout-button";
import {
  normalizePlan,
  PLAN_LIMITS,
  type PlanId,
} from "@/lib/billing/plans";

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$35",
    features: [
      "Contacts, pipeline, bookings",
      "Email rules & auto-reply",
      "Forms & CSV · custom forms",
      "Team invites · up to 2 users",
      "Google Calendar",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$89",
    highlighted: true,
    features: [
      "Everything in Starter",
      "Up to 10 seats & roles",
      "SMS reminders (your Twilio)",
      "Included in the 14-day free trial",
    ],
  },
  {
    id: "business" as const,
    name: "Business",
    price: "$179",
    features: [
      "Everything in Pro",
      "Up to 25 seats",
      "Higher limits",
      "Priority onboarding",
    ],
  },
];

const MATRIX: {
  label: string;
  free: boolean;
  starter: boolean;
  pro: boolean;
  business: boolean;
}[] = [
  { label: "Contacts, pipeline, bookings", free: true, starter: true, pro: true, business: true },
  { label: "Email rules & auto-reply", free: true, starter: true, pro: true, business: true },
  { label: "Team invites", free: false, starter: true, pro: true, business: true },
  { label: "Custom forms", free: false, starter: true, pro: true, business: true },
  { label: "SMS reminders", free: false, starter: false, pro: true, business: true },
];

function unlockSummary(
  planId: PlanId,
  billingStatus: string,
  isTrial: boolean,
): string {
  if (isTrial) {
    return "Pro trial active — team invites, custom forms, and SMS unlocked until the trial ends.";
  }
  if (planId === "none") {
    if ((billingStatus || "").toLowerCase() === "expired") {
      return "Trial ended. Free tier: contacts, bookings, email rules, and auto-reply. Subscribe to restore Pro features.";
    }
    return "Free: contacts, bookings, email rules, and auto-reply. Team invites, custom forms, and SMS need a paid plan.";
  }

  const limits = PLAN_LIMITS[planId];
  const parts: string[] = [`up to ${limits.maxUsers} seats`];
  if (limits.teamInvites) parts.push("team invites");
  if (limits.customForms) parts.push("custom forms");
  if (limits.emailRules) parts.push("email rules");
  if (limits.emailAutomation) parts.push("inbox automation");
  if (limits.smsReminders) parts.push("SMS reminders");
  return parts.join(" · ");
}

export function BillingClient({
  orgName,
  canManage,
  billingStatus,
  periodEnd,
  provider,
  effectivePlan,
  planLabel,
  isActive,
  isTrial,
  daysLeft,
}: {
  orgName: string;
  organizationId: string;
  canManage: boolean;
  plan: string;
  billingStatus: string;
  periodEnd: string | null;
  provider: string | null;
  effectivePlan: string;
  planLabel: string;
  isActive: boolean;
  isTrial: boolean;
  daysLeft: number | null;
}) {
  const planId = normalizePlan(effectivePlan);
  const endLabel =
    periodEnd && !Number.isNaN(new Date(periodEnd).getTime())
      ? new Date(periodEnd).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        Workspace
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Billing</h1>
      <p className="mt-1 text-sm text-slate-500">
        Plan for <span className="font-medium text-slate-800">{orgName}</span>
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Current access
        </p>
        <p className="mt-2 text-lg font-semibold text-slate-900">
          {isTrial ? "Pro trial" : `You are on ${planLabel}`}
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({billingStatus || "none"}
            {provider ? ` · ${provider}` : ""})
          </span>
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {unlockSummary(planId, billingStatus, isTrial)}
        </p>
        {isTrial && daysLeft != null && (
          <p className="mt-2 text-sm font-medium text-sky-800">
            {daysLeft <= 0
              ? "Trial period has ended."
              : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
            {endLabel ? ` · ends ${endLabel}` : ""}
          </p>
        )}
        {!isTrial && endLabel && (
          <p className="mt-1 text-sm text-slate-600">
            {isActive ? "Renews / ends" : "Ended"}: {endLabel}
          </p>
        )}
        {!isActive && !isTrial && (
          <p className="mt-2 text-sm text-amber-700">
            No active paid subscription. Free features still work
            {canManage
              ? " — choose a plan below to unlock the rest."
              : " (ask an owner or admin to subscribe)."}
          </p>
        )}
        {isTrial && (
          <p className="mt-2 text-sm text-slate-600">
            No card on file. When the trial ends you keep Free features; Pro-only
            items (extra seats, SMS, etc.) lock until you subscribe.
          </p>
        )}
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="border-b border-slate-200/80 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Feature</th>
              <th className="px-3 py-3 font-medium">Free</th>
              <th className="px-3 py-3 font-medium">Starter</th>
              <th className="px-3 py-3 font-medium">Pro / trial</th>
              <th className="px-3 py-3 font-medium">Business</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="px-4 py-2.5 text-slate-800">{row.label}</td>
                {(["free", "starter", "pro", "business"] as const).map((k) => (
                  <td key={k} className="px-3 py-2.5">
                    {row[k] ? (
                      <Check className="h-4 w-4 text-sky-600" aria-label="Included" />
                    ) : (
                      <Minus className="h-4 w-4 text-slate-300" aria-label="Not included" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-slate-100">
              <td className="px-4 py-2.5 text-slate-800">Seat limit</td>
              <td className="px-3 py-2.5 text-slate-600">1</td>
              <td className="px-3 py-2.5 text-slate-600">2</td>
              <td className="px-3 py-2.5 text-slate-600">10</td>
              <td className="px-3 py-2.5 text-slate-600">25</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!canManage ? (
        <p className="mt-6 text-sm text-slate-500">
          Only workspace owners and admins can change the subscription.
        </p>
      ) : (
        <>
          <h2 className="mt-10 text-sm font-semibold text-slate-900">
            Choose a monthly plan
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Secure checkout via Lemon Squeezy. You’ll return here after payment.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <article
                key={p.id}
                className={`flex flex-col rounded-xl border p-5 ${
                  p.highlighted
                    ? "border-[#0B132B] bg-sky-600 text-white"
                    : "border-slate-200/80 bg-white text-slate-900"
                }`}
              >
                <h3 className="text-sm font-semibold">{p.name}</h3>
                <p className="mt-2 text-2xl font-semibold">
                  {p.price}
                  <span
                    className={`text-sm font-normal ${
                      p.highlighted ? "text-sky-100" : "text-slate-500"
                    }`}
                  >
                    /mo
                  </span>
                </p>
                {effectivePlan === p.id && isActive && !isTrial && (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      p.highlighted ? "text-sky-100" : "text-sky-700"
                    }`}
                  >
                    Current plan
                  </p>
                )}
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          p.highlighted ? "text-sky-100" : "text-sky-600"
                        }`}
                      />
                      <span
                        className={
                          p.highlighted ? "text-sky-50" : "text-slate-700"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <PricingCheckoutButton
                  plan={p.id}
                  label={
                    effectivePlan === p.id && isActive && !isTrial
                      ? "Manage / renew"
                      : `Subscribe · ${p.name}`
                  }
                  className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium ${
                    p.highlighted
                      ? "bg-white text-[#0B132B] hover:bg-slate-100"
                      : "bg-sky-600 text-white hover:bg-sky-700"
                  }`}
                />
              </article>
            ))}
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Philippines bank / e-wallet: pay manually, then ask platform support
            to activate your plan—or use JNS Admin if you are the platform owner.
          </p>
        </>
      )}
    </div>
  );
}
