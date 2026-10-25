"use client";

import { useState, useTransition } from "react";
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
  const [planDraft, setPlanDraft] = useState<
    Record<string, { plan: PlanId; months: string }>
  >({});

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
      }
    );
  }

  function handleResetLink(userId: string) {
    setResetError(null);
    setResetInfo(null);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await generatePasswordResetLink(userId);
        setResetInfo(result);
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
    } catch {
      // ignore
    }
  }

  function applyPlan(orgId: string) {
    const draft = planDraft[orgId] || { plan: "none" as PlanId, months: "1" };
    setActionError(null);
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
      });

      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function handleExpireOverdue() {
    setActionError(null);
    startTransition(async () => {
      try {
        const r = await expireOverdueSubscriptions();
        alert(`Marked ${r.expired} workspace(s) expired.`);
        window.location.reload();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Could not expire plans",
        );
      }
    });
  }

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

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        Platform
      </span>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">JNS Admin</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Platform access, workspace subscriptions, and a live snapshot for
        business decisions. Org roles stay under each workspace Team tab.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-zinc-200 bg-white p-4"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {m.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">
              {m.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{m.detail}</p>
          </div>
        ))}
      </section>

      {actionError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      )}
      {resetError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {resetError}
        </p>
      )}
      {resetInfo && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
          <p className="font-medium text-zinc-900">
            Reset link for {resetInfo.email}
          </p>
          <p className="mt-1 break-all text-xs text-zinc-600">{resetInfo.link}</p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-2 text-xs underline"
          >
            Copy link
          </button>
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
              Workspace subscriptions
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Assign monthly plans manually (founding clients / PH bank pay).
              Lemon Squeezy will write the same fields when live.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleExpireOverdue}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            Mark overdue as expired
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Workspace</th>
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
                    colSpan={5}
                    className="px-4 py-8 text-center text-zinc-500"
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
                    end.getTime() < Date.now();

                  return (
                    <tr
                      key={org.id}
                      className="border-b border-zinc-50 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">
                          {org.name || "Untitled"}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {org.slug || org.id.slice(0, 8)}
                          {org.billing_provider
                            ? ` · ${org.billing_provider}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium capitalize text-zinc-900">
                          {org.plan || "none"}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {org.billing_status || "—"}
                          {expired ? " · past end" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {end && !Number.isNaN(end.getTime())
                          ? end.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
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
                            className="rounded border border-zinc-200 px-2 py-1 text-xs"
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
                              className="rounded border border-zinc-200 px-2 py-1 text-xs"
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
                          className="rounded-lg bg-[#0B132B] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          Platform users ({activeUsers.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
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
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">
                      {p.business_name || p.email || "—"}
                    </p>
                    <p className="text-xs text-zinc-500">{p.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      disabled={isPending}
                      onChange={(e) => {
                        const role = e.target.value as "user" | "super_admin";
                        startTransition(() => {
                          setUserRole(p.id, role);
                        });
                      }}
                      className="rounded border border-zinc-200 px-2 py-1 text-xs"
                    >
                      <option value="user">user</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.status}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleResetLink(p.id)}
                        className="text-xs font-medium text-zinc-700 underline disabled:opacity-50"
                      >
                        Reset link
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(() => {
                            rejectUser(p.id);
                          })
                        }
                        className="text-xs font-medium text-amber-800 underline disabled:opacity-50"
                      >
                        Block
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemove(p.id, p.email)}
                        className="text-xs font-medium text-red-700 underline disabled:opacity-50"
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
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
            Blocked accounts
          </h2>
          <div className="flex flex-col gap-3">
            {rejectedUsers.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {p.business_name || p.email}
                  </p>
                  <p className="text-xs text-zinc-500">{p.email}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        approveUser(p.id);
                      })
                    }
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                  >
                    Restore access
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(p.id, p.email)}
                    className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-xs text-zinc-400">
        <Link href="/dashboard" className="underline">
          ← Back to overview
        </Link>
      </p>
    </div>
  );
}
