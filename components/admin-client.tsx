"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
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
  const [orgQuery, setOrgQuery] = useState("");
  const [showRejected, setShowRejected] = useState(false);

const activeUsers = profiles.filter((p) => p.status !== "rejected");
  const rejectedUsers = profiles.filter((p) => p.status === "rejected");
  const now = new Date();
  const in14 = now.getTime() + 14 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const usersNewMonth = profiles.filter(
    (p) => new Date(p.created_at) >= monthStart,
  ).length;
  const paidActive = organizations.filter(isPaidActive);
  const estimatedMrr = paidActive.reduce((sum, o) => {
    return sum + (LIST_PRICE[(o.plan || "").toLowerCase()] ?? 0);
  }, 0);

  const byPlan = {
    none: organizations.filter((o) => !o.plan || o.plan === "none").length,
    starter: organizations.filter((o) => o.plan === "starter").length,
    pro: organizations.filter((o) => o.plan === "pro").length,
    business: organizations.filter((o) => o.plan === "business").length,
  };

  const attentionItems = useMemo(() => {
    const items: {
      id: string;
      orgId: string;
      kind: "expiring" | "overdue_active";
      label: string;
      detail: string;
    }[] = [];
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

  const filteredOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) => {
      const hay = [o.name, o.slug, o.owner_email, o.plan, o.billing_status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [organizations, orgQuery]);

  const userList = showRejected ? rejectedUsers : activeUsers;

  function draftFor(org: OrgRow) {
    return (
      planDraft[org.id] || {
        plan: (org.plan as PlanId) || "none",
        months: "1",
        notes: org.plan_notes || "",
      }
    );
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
    if (
      !window.confirm(
        `Permanently delete ${label}?\n\nThis removes their login from the platform.`,
      )
    ) {
      return;
    }
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

  const planMax = Math.max(
    byPlan.none,
    byPlan.starter,
    byPlan.pro,
    byPlan.business,
    1,
  );

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Platform · CEO
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            JNS Command
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">
            Headquarters for workspaces, plans, and people. Private to you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {attentionItems.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All clear
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {attentionItems.length} need attention
            </span>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={handleExpireOverdue}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Mark overdue expired
          </button>
        </div>
      </header>

      {(actionError || actionSuccess || resetError) && (
        <div className="mt-4 space-y-2">
          {actionError && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {actionError}
            </p>
          )}
          {actionSuccess && (
            <p
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              role="status"
            >
              {actionSuccess}
            </p>
          )}
          {resetError && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {resetError}
            </p>
          )}
        </div>
      )}

      {resetInfo && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="font-medium text-slate-900">
            Reset link for {resetInfo.email}
          </p>
          <p className="mt-1 break-all text-xs text-slate-600">
            {resetInfo.link}
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-2 text-xs font-medium text-sky-700 underline"
          >
            Copy link
          </button>
        </div>
      )}

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Est. MRR",
            value: `$${estimatedMrr}`,
            detail: `${paidActive.length} paid active`,
          },
          {
            label: "Workspaces",
            value: String(organizations.length),
            detail: `${byPlan.none} without a plan`,
          },
          {
            label: "Users",
            value: String(profiles.length),
            detail: `${usersNewMonth} new this month`,
          },
          {
            label: "At risk",
            value: String(attentionItems.length),
            detail: "Expiring or overdue",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {k.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              {k.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{k.detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Plan mix</h2>
        <div className="space-y-2.5">
          {[
            { label: "None", value: byPlan.none, color: "bg-slate-300" },
            { label: "Starter", value: byPlan.starter, color: "bg-teal-500" },
            { label: "Pro", value: byPlan.pro, color: "bg-sky-500" },
            {
              label: "Business",
              value: byPlan.business,
              color: "bg-indigo-500",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-slate-500">
                {item.label}
              </span>
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{
                    width: `${Math.max(4, (item.value / planMax) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        {attentionItems.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 px-4 py-3.5">
            <p className="text-sm font-medium text-emerald-900">
              No attention items
            </p>
            <p className="mt-0.5 text-xs text-emerald-800/90">
              No trials or paid periods ending within 14 days, and no active
              workspaces past period end.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-amber-950">
                Needs attention ({attentionItems.length})
              </p>
              <button
                type="button"
                disabled={isPending}
                onClick={handleExpireOverdue}
                className="min-h-[40px] rounded-xl border border-amber-300/80 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-50 disabled:opacity-50"
              >
                Mark overdue as expired
              </button>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {attentionItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedOrgId(item.orgId)}
                    className="flex w-full min-h-[44px] items-start gap-3 rounded-xl border border-amber-200/60 bg-white px-3 py-2.5 text-left transition hover:border-amber-300 hover:bg-amber-50/40"
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
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Workspaces</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Assign plans, review connections, expand for notes.
            </p>
          </div>
          <input
            type="search"
            value={orgQuery}
            onChange={(e) => setOrgQuery(e.target.value)}
            placeholder="Search…"
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm shadow-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Period end</th>
                <th className="px-4 py-3">Conn.</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No workspaces.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const draft = draftFor(org);
                  const end = org.plan_period_end
                    ? new Date(org.plan_period_end)
                    : null;
                  const expired =
                    !!end &&
                    !Number.isNaN(end.getTime()) &&
                    end.getTime() < now.getTime();
                  const expanded = expandedOrgId === org.id;
                  return (
                    <Fragment key={org.id}>
                      <tr className="border-b border-slate-50 hover:bg-slate-50/40">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">
                            {org.name || "Untitled"}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {org.slug || org.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {org.owner_email || "—"}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {org.plan || "none"}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {expired ? "past end" : org.billing_status || "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">
                          {formatDate(org.plan_period_end)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <HealthDot
                              ok={!!org.google_connected}
                              warn={!!org.google_needs_reauth}
                            />
                            <HealthDot ok={!!org.twilio_connected} />
                            <HealthDot
                              ok={(org.arketa_location_count ?? 0) > 0}
                            />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrgId(expanded ? null : org.id)
                            }
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                          >
                            {expanded ? "Close" : "Manage"}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-slate-100 bg-slate-50/40">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="flex flex-wrap items-end gap-2">
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
                                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
                                  className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
                                className="min-h-[40px] rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                Apply plan
                              </button>
                            </div>
                            <div className="mt-3">
                              <label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Plan notes
                              </label>
                              <textarea
                                value={draft.notes}
                                disabled={isPending}
                                onChange={(e) =>
                                  setPlanDraft((prev) => ({
                                    ...prev,
                                    [org.id]: {
                                      ...draft,
                                      notes: e.target.value,
                                    },
                                  }))
                                }
                                rows={2}
                                className="mt-1 w-full max-w-lg rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                placeholder="Internal notes"
                              />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              Owner: {org.owner_email || "—"} · Provider:{" "}
                              {org.billing_provider || "—"} · Google:{" "}
                              {org.google_connected
                                ? org.google_needs_reauth
                                  ? "reauth"
                                  : "ok"
                                : "off"}{" "}
                              · Twilio: {org.twilio_connected ? "ok" : "off"} ·
                              Arketa: {org.arketa_location_count ?? 0}
                            </p>
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
      </section>

      <section className="mt-12 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">People</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Platform accounts — roles, approval, reset, removal.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowRejected(false)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                !showRejected
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              Active ({activeUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setShowRejected(true)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                showRejected
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              Rejected ({rejectedUsers.length})
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 hover:bg-slate-50/40"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">
                      {p.email || "—"}
                    </span>
                    {p.business_name && (
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {p.business_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!showRejected ? (
                      <select
                        value={
                          p.role === "super_admin" ? "super_admin" : "user"
                        }
                        disabled={isPending}
                        onChange={(e) => {
                          const role = e.target.value as
                            | "user"
                            | "super_admin";
                          setActionError(null);
                          setActionSuccess(null);
                          startTransition(async () => {
                            try {
                              await setUserRole(p.id, role);
                              setActionSuccess("Role updated.");
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
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="user">user</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    ) : (
                      <span className="text-xs text-slate-500">{p.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {showRejected ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              try {
                                await approveUser(p.id);
                                window.location.reload();
                              } catch (err) {
                                setActionError(
                                  err instanceof Error
                                    ? err.message
                                    : "Could not approve",
                                );
                              }
                            });
                          }}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Approve
                        </button>
                      ) : (
                        <>
                          {(p.status === "pending" ||
                            p.status === "pending_review") && (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  startTransition(async () => {
                                    try {
                                      await approveUser(p.id);
                                      window.location.reload();
                                    } catch (err) {
                                      setActionError(
                                        err instanceof Error
                                          ? err.message
                                          : "Could not approve",
                                      );
                                    }
                                  });
                                }}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  startTransition(async () => {
                                    try {
                                      await rejectUser(p.id);
                                      window.location.reload();
                                    } catch (err) {
                                      setActionError(
                                        err instanceof Error
                                          ? err.message
                                          : "Could not reject",
                                      );
                                    }
                                  });
                                }}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleResetLink(p.id)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                          >
                            Reset link
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRemove(p.id, p.email)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
