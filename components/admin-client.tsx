"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  approveUser,
  rejectUser,
  setUserRole,
  removeUser,
  generatePasswordResetLink,
  setOrganizationSubscription,
  expireOverdueSubscriptions,
} from "@/app/admin/actions";
import type { PlanId } from "@/lib/billing/plans";

type Profile = {
  id: string;
  email: string | null;
  business_name: string | null;
  role: string;
  status: string;
  created_at: string;
};

type OrgRow = {
  id: string;
  name: string | null;
  slug: string | null;
  plan: string | null;
  billing_status: string | null;
  billing_provider: string | null;
  plan_period_end: string | null;
  plan_notes: string | null;
  owner_email?: string | null;
  owner_role?: string | null;
  google_connected?: boolean;
  google_needs_reauth?: boolean;
  google_email?: string | null;
  twilio_connected?: boolean;
  arketa_location_count?: number;
};

type AttentionItem = {
  id: string;
  orgId: string;
  orgName: string;
  kind: "expiring" | "overdue_active";
  label: string;
  detail: string;
};

const LIST_PRICE: Record<string, number> = {
  starter: 35,
  pro: 89,
  business: 179,
};

function isPaidActive(org: OrgRow) {
  const plan = (org.plan || "none").toLowerCase();
  if (!["starter", "pro", "business"].includes(plan)) return false;
  const status = (org.billing_status || "").toLowerCase();
  if (status !== "active" && status !== "trialing") return false;
  if (org.plan_period_end) {
    const end = new Date(org.plan_period_end).getTime();
    if (!Number.isNaN(end) && end < Date.now()) return false;
  }
  return true;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(iso: string) {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

export function AdminClient({
  profiles,
  organizations,
}: {
  profiles: Profile[];
  organizations: OrgRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [resetInfo, setResetInfo] = useState<{
    email: string;
    link: string;
  } | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [planDraft, setPlanDraft] = useState<
    Record<string, { plan: PlanId; months: string; notes: string }>
  >({});
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [highlightOrgId, setHighlightOrgId] = useState<string | null>(null);

  const activeUsers = profiles.filter((p) => p.status !== "rejected");
  const rejectedUsers = profiles.filter((p) => p.status === "rejected");

  const now = new Date();
  const monthStart = startOfMonth(now);
  const in14 = now.getTime() + 14 * 24 * 60 * 60 * 1000;

  const usersTotal = profiles.length;
  const usersNewMonth = profiles.filter(
    (p) => new Date(p.created_at) >= monthStart,
  ).length;

  const orgsTotal = organizations.length;
  const paidActive = organizations.filter(isPaidActive);
  const byPlan = {
    none: organizations.filter((o) => !o.plan || o.plan === "none").length,
    starter: organizations.filter((o) => o.plan === "starter").length,
    pro: organizations.filter((o) => o.plan === "pro").length,
    business: organizations.filter((o) => o.plan === "business").length,
  };

  const estimatedMrr = paidActive.reduce((sum, o) => {
    const plan = (o.plan || "").toLowerCase();
    return sum + (LIST_PRICE[plan] ?? 0);
  }, 0);

  const expiringSoon = organizations.filter((o) => {
    if (!isPaidActive(o) || !o.plan_period_end) return false;
    const end = new Date(o.plan_period_end).getTime();
    return !Number.isNaN(end) && end <= in14 && end >= now.getTime();
  }).length;

  const expiredOrCancelled = organizations.filter((o) => {
    const status = (o.billing_status || "").toLowerCase();
    if (status === "expired" || status === "cancelled") return true;
    if (o.plan_period_end && o.plan && o.plan !== "none") {
      const end = new Date(o.plan_period_end).getTime();
      if (!Number.isNaN(end) && end < now.getTime()) return true;
    }
    return false;
  }).length;

  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = [];
    for (const o of organizations) {
      const status = (o.billing_status || "").toLowerCase();
      const plan = (o.plan || "none").toLowerCase();
      if (!o.plan_period_end || plan === "none") continue;
      const endMs = new Date(o.plan_period_end).getTime();
      if (Number.isNaN(endMs)) continue;
      const name = o.name || o.slug || "Workspace";
      const days = daysUntil(o.plan_period_end);

      if (
        (status === "active" || status === "trialing") &&
        endMs < Date.now()
      ) {
        items.push({
          id: `overdue-${o.id}`,
          orgId: o.id,
          orgName: name,
          kind: "overdue_active",
          label: "Past period end",
          detail: `${name} · ${plan} still ${status} · ended ${formatDate(o.plan_period_end)}`,
        });
        continue;
      }

      if (isPaidActive(o) && endMs >= Date.now() && endMs <= in14) {
        items.push({
          id: `expiring-${o.id}`,
          orgId: o.id,
          orgName: name,
          kind: "expiring",
          label:
            days != null && days <= 7
              ? "Ends within 7 days"
              : "Ends within 14 days",
          detail: `${name} · ${plan} · ends ${formatDate(o.plan_period_end)}${
            days != null ? ` (${days}d)` : ""
          }`,
        });
      }
    }
    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "overdue_active" ? -1 : 1;
      return a.detail.localeCompare(b.detail);
    });
    return items;
  }, [organizations, in14]);

  const metricCards = [
    {
      label: "Total users",
      value: String(usersTotal),
      detail: `${usersNewMonth} new this month`,
    },
    {
      label: "Workspaces",
      value: String(orgsTotal),
      detail: `${paidActive.length} paid active`,
    },
    {
      label: "Est. MRR",
      value: `$${estimatedMrr}`,
      detail: "List price × active paid",
    },
    {
      label: "Expiring ≤14 days",
      value: String(expiringSoon),
      detail: "Renew or follow up",
    },
    {
      label: "Expired / cancelled",
      value: String(expiredOrCancelled),
      detail: "Churn signal",
    },
    {
      label: "No plan",
      value: String(byPlan.none),
      detail: "Not converting yet",
    },
    {
      label: "Starter",
      value: String(byPlan.starter),
      detail: "Workspaces on Starter",
    },
    {
      label: "Pro + Business",
      value: String(byPlan.pro + byPlan.business),
      detail: `${byPlan.pro} Pro · ${byPlan.business} Business`,
    },
  ] as const;

  function draftFor(org: OrgRow) {
    return (
      planDraft[org.id] || {
        plan: (org.plan as PlanId) || "none",
        months: "1",
        notes: org.plan_notes || "",
      }
    );
  }

  function scrollToOrg(orgId: string) {
    setHighlightOrgId(orgId);
    setExpandedOrgId(orgId);
    requestAnimationFrame(() => {
      const el =
        document.getElementById(`admin-org-${orgId}`) ||
        document.getElementById(`admin-org-m-${orgId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    window.setTimeout(() => setHighlightOrgId(null), 2500);
  }

  function handleResetLink(userId: string) {
    setResetError(null);
    setResetInfo(null);
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      try {
        const result = await generatePasswordResetLink(userId);
        setResetInfo(result);
        setActionSuccess("Reset link generated.");
      } catch (err) {
        setResetError(
          err instanceof Error ? err.message : "Could not generate link",
        );
      }
    });
  }

  function handleRemove(userId: string, email: string | null) {
    const label = email || "this user";
    const ok = window.confirm(
      `Permanently delete ${label}?\n\nThis removes their login from the platform. They can register again with the same email.`,
    );
    if (!ok) return;

    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      try {
        await removeUser(userId);
        window.location.reload();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Could not delete user",
        );
      }
    });
  }

  async function copyLink() {
    if (!resetInfo?.link) return;
    try {
      await navigator.clipboard.writeText(resetInfo.link);
      setActionSuccess("Link copied to clipboard.");
    } catch {
      // ignore
    }
  }

  function applyPlan(orgId: string) {
    const draft = planDraft[orgId] || {
      plan: "none" as PlanId,
      months: "1",
      notes: "",
    };
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      let periodEndIso: string | null | undefined = undefined;
      if (draft.plan === "none") {
        periodEndIso = null;
      } else {
        const months = Math.max(1, parseInt(draft.months || "1", 10) || 1);
        const end = new Date();
        end.setMonth(end.getMonth() + months);
        periodEndIso = end.toISOString();
      }

      const result = await setOrganizationSubscription({
        organizationId: orgId,
        plan: draft.plan,
        renewOneMonth: false,
        periodEndIso: draft.plan === "none" ? null : periodEndIso,
        notes: draft.notes?.trim() ? draft.notes.trim() : null,
      });

      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setActionSuccess("Plan updated.");
      window.location.reload();
    });
  }

  function handleExpireOverdue() {
    setActionError(null);
    setActionSuccess(null);
    startTransition(async () => {
      try {
        const r = await expireOverdueSubscriptions();
        setActionSuccess(`Marked ${r.expired} workspace(s) expired.`);
        window.location.reload();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Could not expire plans",
        );
      }
    });
  }

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        Platform
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">JNS Admin</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Workspace health, plan ops, and support context. Prospecting stays in a
        normal org workspace — Admin is platform operations only.
      </p>

      <section className="mt-6">
        {attentionItems.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
            <p className="font-medium">No attention items</p>
            <p className="mt-0.5 text-xs text-emerald-800/90">
              No trials or paid periods ending within 14 days, and no active
              workspaces past period end.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-amber-950">
                Needs attention ({attentionItems.length})
              </p>
              <button
                type="button"
                disabled={isPending}
                onClick={handleExpireOverdue}
                className="min-h-[44px] rounded-xl border border-amber-300/80 bg-white px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-50 disabled:opacity-50 sm:min-h-0 sm:py-1.5"
              >
                Mark overdue as expired
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {attentionItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => scrollToOrg(item.orgId)}
                    className="flex w-full min-h-[44px] items-start gap-3 rounded-xl border border-amber-200/60 bg-white px-3 py-2.5 text-left transition hover:border-amber-300 hover:bg-amber-50/50"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        item.kind === "overdue_active"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {item.kind === "overdue_active" ? "Overdue" : "Expiring"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900">
                        {item.label}
                      </span>
                      <span className="block text-xs text-slate-600">
                        {item.detail}
                      </span>
                    </span>
                    <span className="shrink-0 self-center text-xs font-medium text-sky-700">
                      View →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-4"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {m.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {m.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{m.detail}</p>
          </div>
        ))}
      </section>

      {actionError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      )}
      {actionSuccess && (
        <p className="mt-4 text-sm text-emerald-700" role="status">
          {actionSuccess}
        </p>
      )}
      {resetError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {resetError}
        </p>
      )}
      {resetInfo && (
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-900">
            Reset link for {resetInfo.email}
          </p>
          <p className="mt-1 break-all text-xs text-slate-600">{resetInfo.link}</p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-2 min-h-[44px] text-xs font-medium text-sky-700 underline sm:min-h-0"
          >
            Copy link
          </button>
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
              Workspace subscriptions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Assign monthly plans manually (founding clients / PH bank pay).
              Expand a row for owner, notes, and connection health.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleExpireOverdue}
            className="min-h-[44px] rounded-2xl border border-slate-200/80 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0 sm:py-1.5"
          >
            Mark overdue as expired
          </button>
        </div>

        <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white md:block">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Current</th>
                <th className="px-4 py-3 font-medium">Period end</th>
                <th className="px-4 py-3 font-medium">Set plan</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {organizations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No workspaces yet.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => {
                  const draft = draftFor(org);
                  const end = org.plan_period_end
                    ? new Date(org.plan_period_end)
                    : null;
                  const expired =
                    end &&
                    !Number.isNaN(end.getTime()) &&
                    end.getTime() < now.getTime();
                  const expanded = expandedOrgId === org.id;
                  const highlighted = highlightOrgId === org.id;

                  return (
                    <Fragment key={org.id}>
                      <tr
                        id={`admin-org-${org.id}`}
                        className={`border-b border-slate-50 last:border-0 ${
                          highlighted ? "bg-amber-50/80" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrgId(expanded ? null : org.id)
                            }
                            className="text-left"
                          >
                            <p className="font-medium text-slate-900">
                              {org.name || "Untitled"}
                              <span className="ml-1.5 text-xs font-normal text-slate-400">
                                {expanded ? "▾" : "▸"}
                              </span>
                            </p>
                            <p className="text-xs text-slate-400">
                              {org.slug || org.id.slice(0, 8)}
                              {org.billing_provider
                                ? ` · ${org.billing_provider}`
                                : ""}
                            </p>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-800">
                            {org.owner_email || "—"}
                          </p>
                          {org.owner_role && (
                            <p className="text-xs capitalize text-slate-400">
                              {org.owner_role}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium capitalize text-slate-900">
                            {org.plan || "none"}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {org.billing_status || "—"}
                            {expired ? " · past end" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(org.plan_period_end)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={draft.plan}
                              disabled={isPending}
                              onChange={(e) =>
                                setPlanDraft((prev) => ({
                                  ...prev,
                                  [org.id]: {
                                    ...draft,
                                    plan: e.target.value as PlanId,
                                  },
                                }))
                              }
                              className="min-h-[36px] rounded border border-slate-200/80 px-2 py-1 text-xs"
                            >
                              <option value="none">No plan</option>
                              <option value="starter">Starter</option>
                              <option value="pro">Pro</option>
                              <option value="business">Business</option>
                            </select>
                            {draft.plan !== "none" && (
                              <select
                                value={draft.months}
                                disabled={isPending}
                                onChange={(e) =>
                                  setPlanDraft((prev) => ({
                                    ...prev,
                                    [org.id]: {
                                      ...draft,
                                      months: e.target.value,
                                    },
                                  }))
                                }
                                className="min-h-[36px] rounded border border-slate-200/80 px-2 py-1 text-xs"
                                title="Months from today"
                              >
                                <option value="1">1 month</option>
                                <option value="2">2 months</option>
                                <option value="3">3 months</option>
                                <option value="6">6 months</option>
                                <option value="12">12 months</option>
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => applyPlan(org.id)}
                            className="min-h-[36px] rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          >
                            Apply
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-slate-100 bg-slate-50/80">
                          <td colSpan={6} className="px-4 py-4">
                            <OrgDetailPanel
                              org={org}
                              draft={draft}
                              isPending={isPending}
                              onNotesChange={(notes) =>
                                setPlanDraft((prev) => ({
                                  ...prev,
                                  [org.id]: { ...draft, notes },
                                }))
                              }
                              onApply={() => applyPlan(org.id)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3 md:hidden">
          {organizations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No workspaces yet.
            </div>
          ) : (
            organizations.map((org) => {
              const draft = draftFor(org);
              const end = org.plan_period_end
                ? new Date(org.plan_period_end)
                : null;
              const expired =
                end &&
                !Number.isNaN(end.getTime()) &&
                end.getTime() < now.getTime();
              const expanded = expandedOrgId === org.id;
              const highlighted = highlightOrgId === org.id;

              return (
                <div
                  key={org.id}
                  id={`admin-org-m-${org.id}`}
                  className={`rounded-2xl border bg-white p-4 ${
                    highlighted
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-slate-200/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOrgId(expanded ? null : org.id)
                    }
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {org.name || "Untitled"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {org.owner_email || org.slug || org.id.slice(0, 8)}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {expanded ? "▾" : "▸"}
                    </span>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize text-slate-700">
                      {org.plan || "none"} · {org.billing_status || "—"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                      Ends {formatDate(org.plan_period_end)}
                      {expired ? " · past" : ""}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={draft.plan}
                      disabled={isPending}
                      onChange={(e) =>
                        setPlanDraft((prev) => ({
                          ...prev,
                          [org.id]: {
                            ...draft,
                            plan: e.target.value as PlanId,
                          },
                        }))
                      }
                      className="min-h-[44px] flex-1 rounded-xl border border-slate-200/80 px-3 text-sm"
                    >
                      <option value="none">No plan</option>
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="business">Business</option>
                    </select>
                    {draft.plan !== "none" && (
                      <select
                        value={draft.months}
                        disabled={isPending}
                        onChange={(e) =>
                          setPlanDraft((prev) => ({
                            ...prev,
                            [org.id]: {
                              ...draft,
                              months: e.target.value,
                            },
                          }))
                        }
                        className="min-h-[44px] rounded-xl border border-slate-200/80 px-3 text-sm"
                      >
                        <option value="1">1 mo</option>
                        <option value="2">2 mo</option>
                        <option value="3">3 mo</option>
                        <option value="6">6 mo</option>
                        <option value="12">12 mo</option>
                      </select>
                    )}
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => applyPlan(org.id)}
                      className="min-h-[44px] rounded-xl bg-sky-600 px-4 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {expanded && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <OrgDetailPanel
                        org={org}
                        draft={draft}
                        isPending={isPending}
                        onNotesChange={(notes) =>
                          setPlanDraft((prev) => ({
                            ...prev,
                            [org.id]: { ...draft, notes },
                          }))
                        }
                        onApply={() => applyPlan(org.id)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Platform users ({activeUsers.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {p.business_name || p.email || "—"}
                    </p>
                    <p className="text-xs text-slate-500">{p.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      disabled={isPending}
                      onChange={(e) => {
                        const role = e.target.value as "user" | "super_admin";
                        setActionError(null);
                        setActionSuccess(null);
                        startTransition(async () => {
                          try {
                            await setUserRole(p.id, role);
                            window.location.reload();
                          } catch (err) {
                            setActionError(
                              err instanceof Error
                                ? err.message
                                : "Could not update role",
                            );
                          }
                        });
                      }}
                      className="min-h-[36px] rounded border border-slate-200/80 px-2 py-1 text-xs"
                    >
                      <option value="user">user</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.status}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleResetLink(p.id)}
                        className="min-h-[36px] text-xs font-medium text-slate-700 underline disabled:opacity-50"
                      >
                        Reset link
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(() => {
                            rejectUser(p.id).then(() =>
                              window.location.reload(),
                            );
                          })
                        }
                        className="min-h-[36px] text-xs font-medium text-amber-800 underline disabled:opacity-50"
                      >
                        Block
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemove(p.id, p.email)}
                        className="min-h-[36px] text-xs font-medium text-red-700 underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {rejectedUsers.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Blocked accounts
          </h2>
          <div className="flex flex-col gap-3">
            {rejectedUsers.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {p.business_name || p.email}
                  </p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        approveUser(p.id).then(() => window.location.reload());
                      })
                    }
                    className="min-h-[44px] rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    Restore access
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(p.id, p.email)}
                    className="min-h-[44px] text-xs font-medium text-red-700 underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-slate-400">
        <Link href="/dashboard" className="underline">
          ← Back to overview
        </Link>
      </p>
    </div>
  );
}

function OrgDetailPanel({
  org,
  draft,
  isPending,
  onNotesChange,
  onApply,
}: {
  org: OrgRow;
  draft: { plan: PlanId; months: string; notes: string };
  isPending: boolean;
  onNotesChange: (notes: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Support context
        </p>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-slate-500">Owner</dt>
            <dd className="text-slate-900">
              {org.owner_email || "—"}
              {org.owner_role ? (
                <span className="ml-1 text-xs capitalize text-slate-400">
                  ({org.owner_role})
                </span>
              ) : null}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-slate-500">Provider</dt>
            <dd className="text-slate-900">{org.billing_provider || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-slate-500">Slug</dt>
            <dd className="font-mono text-xs text-slate-700">
              {org.slug || org.id}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Connections (read-only)
        </p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <HealthDot
              ok={Boolean(org.google_connected) && !org.google_needs_reauth}
              warn={Boolean(org.google_needs_reauth)}
            />
            <span className="text-slate-800">
              Google{" "}
              {org.google_needs_reauth
                ? "needs reauth"
                : org.google_connected
                  ? "connected"
                  : "not connected"}
            </span>
            {org.google_email && (
              <span className="truncate text-xs text-slate-400">
                {org.google_email}
              </span>
            )}
          </li>
          <li className="flex items-center gap-2">
            <HealthDot ok={Boolean(org.twilio_connected)} />
            <span className="text-slate-800">
              Twilio {org.twilio_connected ? "connected" : "not connected"}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <HealthDot ok={(org.arketa_location_count ?? 0) > 0} />
            <span className="text-slate-800">
              Arketa{" "}
              {(org.arketa_location_count ?? 0) > 0
                ? `${org.arketa_location_count} location${
                    (org.arketa_location_count ?? 0) === 1 ? "" : "s"
                  }`
                : "none"}
            </span>
          </li>
        </ul>
      </div>

      <div className="sm:col-span-2 lg:col-span-1">
        <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Plan notes
        </label>
        <textarea
          value={draft.notes}
          disabled={isPending}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Internal notes (saved on Apply)"
          className="mt-2 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={onApply}
          className="mt-2 min-h-[44px] rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 sm:min-h-0 sm:py-1.5"
        >
          Save notes + plan
        </button>
        {org.plan_notes && org.plan_notes !== draft.notes && (
          <p className="mt-1 text-xs text-slate-400">
            Current on server: {org.plan_notes}
          </p>
        )}
      </div>
    </div>
  );
}

function HealthDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        warn ? "bg-amber-500" : ok ? "bg-emerald-500" : "bg-slate-300"
      }`}
      aria-hidden
    />
  );
}
