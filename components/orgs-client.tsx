"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createWorkspace,
  switchOrganization,
} from "@/app/dashboard/orgs/actions";

type OrgRow = {
  id: string;
  name: string;
  role: string;
  kind: "personal" | "business";
  logoUrl: string | null;
  planLabel: string;
  isActive: boolean;
};

function roleLabel(role: string) {
  if (role === "ceo") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "assistant") return "Assistant";
  if (role === "member") return "Member";
  return role;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "W";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function OrgsClient({
  orgs,
  maxWorkspaces,
  canCreate,
}: {
  orgs: OrgRow[];
  maxWorkspaces: number;
  canCreate: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [, startSwitch] = useTransition();

  function openOrg(organizationId: string) {
    setError(null);
    setPendingId(organizationId);

    startSwitch(async () => {
      try {
        const result = await switchOrganization(organizationId);
        if (!result.ok) {
          setError(result.error);
          setPendingId(null);
          return;
        }
        window.location.assign("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not switch");
        setPendingId(null);
      }
    });
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError("Workspace name is required.");
      return;
    }

    startCreate(async () => {
      try {
        const result = await createWorkspace(trimmed);
        if (!result.ok) {
          setCreateError(result.error);
          return;
        }
        window.location.assign(result.next);
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : "Could not create workspace",
        );
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Workspaces
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            My workspaces
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Switch between businesses to manage each workspace&apos;s contacts,
            bookings, and integrations. Billing is per workspace.
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v);
              setCreateError(null);
            }}
            className="rounded-xl bg-sky-600 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            {showCreate ? "Cancel" : "+ New workspace"}
          </button>
        ) : (
          <p className="max-w-xs text-right text-xs text-slate-500">
            Limit of {maxWorkspaces} workspaces reached. Contact support if you
            need more.
          </p>
        )}
      </div>

      {showCreate && canCreate && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Create a business workspace
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Starts its own 14-day Pro trial. You become the owner.
          </p>
          <label
            htmlFor="new-workspace-name"
            className="mt-4 block text-sm font-medium text-slate-700"
          >
            Workspace name
          </label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <input
              id="new-workspace-name"
              required
              maxLength={120}
              value={newName}
              disabled={isCreating}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Northstar Studio"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0B132B] disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={isCreating || !newName.trim()}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {isCreating ? "Creating…" : "Create workspace"}
            </button>
          </div>
          {createError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {createError}
            </p>
          )}
        </form>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {orgs.length === 0 ? (
          <p className="text-sm text-slate-500">No workspaces yet.</p>
        ) : (
          orgs.map((org) => {
            const isThisPending = pendingId === org.id;
            return (
              <div
                key={org.id}
                className={`flex flex-col gap-3 rounded-2xl border bg-white p-4 ${
                  org.isActive
                    ? "border-emerald-200 ring-1 ring-emerald-100"
                    : "border-slate-200/80"
                }`}
              >
                <div className="flex items-start gap-3">
                  {org.logoUrl ? (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <Image
                        src={org.logoUrl}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
                      {initials(org.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {org.name}
                      </p>
                      {org.isActive && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {roleLabel(org.role)}
                      {" · "}
                      <span className="capitalize">{org.kind}</span>
                      {" · "}
                      {org.planLabel}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {org.isActive ? (
                    <>
                      <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-500">
                        Opened
                      </span>
                      <Link
                        href="/dashboard/workspace"
                        className="rounded-xl border border-slate-200/80 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Manage
                      </Link>
                      <Link
                        href="/dashboard/billing"
                        className="rounded-xl border border-slate-200/80 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Billing
                      </Link>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingId !== null}
                      onClick={() => openOrg(org.id)}
                      className="rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isThisPending ? "Switching…" : "Switch"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
