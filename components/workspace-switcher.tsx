"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { switchOrganization } from "@/app/dashboard/orgs/actions";

export type WorkspaceOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export function WorkspaceSwitcher({
  workspaces,
  currentName,
}: {
  workspaces: WorkspaceOption[];
  currentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (workspaces.length <= 1) {
    return (
      <p className="truncate text-sm font-semibold text-slate-900">
        {currentName}
      </p>
    );
  }

  function switchTo(organizationId: string) {
    if (workspaces.find((w) => w.id === organizationId)?.isActive) {
      setOpen(false);
      return;
    }
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
        window.location.assign("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not switch");
        setPendingId(null);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full max-w-full items-center gap-1 rounded-lg px-0.5 py-0.5 text-left hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
          {currentName}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close workspace menu"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                role="option"
                aria-selected={w.isActive}
                disabled={pendingId !== null}
                onClick={() => switchTo(w.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {w.name}
                  {pendingId === w.id ? "…" : ""}
                </span>
                {w.isActive && (
                  <Check size={14} className="shrink-0 text-sky-600" />
                )}
              </button>
            ))}
            <div className="border-t border-slate-100 px-1 py-1">
              <Link
                href="/dashboard/orgs"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50"
              >
                Manage workspaces
              </Link>
            </div>
            {error && (
              <p className="px-3 py-1 text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
