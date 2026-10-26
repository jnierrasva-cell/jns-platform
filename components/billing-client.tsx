"use client";

import { Check } from "lucide-react";
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
      "Forms & CSV",
      "Up to 2 users",
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
      "Email rules & auto-reply",
      "Team invites",
      "SMS reminders (usage extra)",
    ],
  },
  {
    id: "business" as const,
    name: "Business",
    price: "$179",
    features: [
      "Everything in Pro",
      "More seats",
      "Higher limits",
      "Priority onboarding",
    ],
  },
];

function unlockSummary(planId: PlanId): string {
  const limits = PLAN_LIMITS[planId];
  if (planId === "none") {
    return "No paid plan active — contacts and bookings still work; email automation, rules, and team invites stay locked until you subscribe.";
  }

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
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        Workspace
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Billing</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Plan for <span className="font-medium text-zinc-800">{orgName}</span>
      </p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Current access
        </p>
        <p className="mt-2 text-lg font-semibold text-zinc-900">
          You are on {planLabel}
          <span className="ml-2 text-sm font-normal text-zinc-500">
            ({billingStatus || "none"}
            {provider ? ` · ${provider}` : ""})
          </span>
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Unlocks: {unlockSummary(planId)}
        </p>
        {endLabel && (
          <p className="mt-1 text-sm text-zinc-600">
            {isActive ? "Renews / ends" : "Ended"}: {endLabel}
          </p>
        )}
        {!isActive && (
          <p className="mt-2 text-sm text-amber-700">
            No active subscription on this workspace. Choose a plan below
            {canManage ? "" : " (ask an owner or admin to subscribe)"}.
          </p>
        )}
      </div>

      {!canManage ? (
        <p className="mt-6 text-sm text-zinc-500">
          Only workspace owners and admins can change the subscription.
        </p>
      ) : (
        <>
          <h2 className="mt-10 text-sm font-semibold text-zinc-900">
            Choose a monthly plan
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Secure checkout via Lemon Squeezy. You’ll return here after payment.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <article
                key={p.id}
                className={`flex flex-col rounded-xl border p-5 ${
                  p.highlighted
                    ? "border-[#0B132B] bg-[#0B132B] text-white"
                    : "border-zinc-200 bg-white text-zinc-900"
                }`}
              >
                <h3 className="text-sm font-semibold">{p.name}</h3>
                <p className="mt-2 text-2xl font-semibold">
                  {p.price}
                  <span
                    className={`text-sm font-normal ${
                      p.highlighted ? "text-slate-400" : "text-zinc-500"
                    }`}
                  >
                    /mo
                  </span>
                </p>
                {effectivePlan === p.id && isActive && (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      p.highlighted ? "text-cyan-300" : "text-sky-700"
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
                          p.highlighted ? "text-cyan-300" : "text-sky-600"
                        }`}
                      />
                      <span
                        className={
                          p.highlighted ? "text-slate-200" : "text-zinc-700"
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
                    effectivePlan === p.id && isActive
                      ? "Manage / renew"
                      : `Subscribe · ${p.name}`
                  }
                  className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium ${
                    p.highlighted
                      ? "bg-white text-[#0B132B] hover:bg-slate-100"
                      : "bg-[#0B132B] text-white hover:bg-[#111e3a]"
                  }`}
                />
              </article>
            ))}
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            Philippines bank / e-wallet: pay manually, then ask platform support
            to activate your plan—or use JNS Admin if you are the platform owner.
          </p>
        </>
      )}
    </div>
  );
}
