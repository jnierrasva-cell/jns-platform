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

type AttentionItem = {
  id: string;
  orgId: string;
  orgName: string;
  kind: "expiring" | "overdue_active";
  label: string;
  detail: string;
};

type OrgFilter =
  | "all"
  | "paid"
  | "trialing"
  | "expiring"
  | "overdue"
  | "none"
  | "starter"
  | "pro"
  | "business";

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

function planLabel(plan: string | null | undefined) {
  const p = (plan || "none").toLowerCase();
  if (p === "none" || !p) return "None";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function statusTone(status: string | null | undefined, expired?: boolean) {
  const s = (status || "").toLowerCase();
  if (expired || s === "expired" || s === "cancelled") {
    return "bg-slate-100 text-slate-600 ring-slate-200/80";
  }
  if (s === "trialing") return "bg-violet-50 text-violet-800 ring-violet-200/70";
  if (s === "active") return "bg-emerald-50 text-emerald-800 ring-emerald-200/70";
  if (s === "past_due") return "bg-amber-50 text-amber-900 ring-amber-200/70";
  return "bg-slate-50 text-slate-600 ring-slate-200/70";
}

function planTone(plan: string | null | undefined) {
  const p = (plan || "none").toLowerCase();
  if (p === "business") return "bg-indigo-50 text-indigo-800 ring-indigo-200/70";
  if (p === "pro") return "bg-sky-50 text-sky-800 ring-sky-200/70";
  if (p === "starter") return "bg-teal-50 text-teal-800 ring-teal-200/70";
  return "bg-slate-50 text-slate-500 ring-slate-200/70";
}

/** Simple horizontal bar chart (no chart lib). */
function BarChart({
  items,
  max,
}: {
  items: { label: string; value: number; color: string }[];
  max: number;
}) {
  const safeMax = Math.max(max, 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-slate-500">
            {item.label}
          </span>
          <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{
                width: `${Math.max(4,
... 