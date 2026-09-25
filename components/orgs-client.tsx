"use client";

import { useState, useTransition } from "react";
import { switchOrganization } from "@/app/dashboard/orgs/actions";

type OrgRow = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

function roleLabel(role: string) {
  if (role === "ceo") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "assistant") return "Assistant";
  if (role === "member") return "Member";
  return role;
}

export function OrgsClient({ orgs }: { orgs: OrgRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function openOrg(organizationId: string) {
    setError(null);
    setPendingId(organizationId);

    startTransition(async () => {
      try {
        const result = await switchOrganization(organizationId);
        if (!result.ok) {
          setError(result.error);
          setPendingId(null);
          return;
        }
        // Full navigation so layout loads the new active org
        window.location.assign("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not switch");
        setPendingId(null);
      }
    });
  }

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        Workspaces
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        My orgs
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Open a workspace to use its contacts, bookings, and integrations. Your
        other orgs stay saved here.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-3">
        {orgs.length === 0 ? (
          <p className="text-sm text-zinc-500">No organizations yet.</p>
        ) : (
          orgs.map((org) => {
            const isThisPending = pendingId === org.id;
            return (
              <div
                key={org.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">
                      {org.name}
                    </p>
                    {org.isActive && (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Your role: {roleLabel(org.role)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pendingId !== null || org.isActive}
                  onClick={() => openOrg(org.id)}
                  className="rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {org.isActive
                    ? "Opened"
                    : isThisPending
                      ? "Opening…"
                      : "Open"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}