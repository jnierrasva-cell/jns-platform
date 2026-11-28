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

// Temporary minimal shell while full HQ file is applied in follow-up commit.
// Prefer the full Admin HQ client from the local workspace (admin-client.tsx).

export function AdminClient({
  profiles = [],
  organizations = [],
}: {
  profiles?: unknown[];
  organizations?: unknown[];
}) {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        Platform · CEO
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">JNS Command</h1>
      <p className="mt-2 text-sm text-slate-500">
        Admin UI is being upgraded to the Command HQ layout. If you see this
        shell, the full client has not finished deploying — refresh in a moment
        or contact support.
      </p>
      <p className="mt-4 text-xs text-slate-400">
        Loaded {Array.isArray(profiles) ? profiles.length : 0} users ·{" "}
        {Array.isArray(organizations) ? organizations.length : 0} workspaces
      </p>
    </div>
  );
}
