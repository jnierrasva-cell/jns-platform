"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export type FirstRunStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  done: boolean;
  critical: boolean;
};

const STORAGE_PREFIX = "jns:first-run-skipped:";

function skipKey(organizationId: string) {
  return `${STORAGE_PREFIX}${organizationId}`;
}

export function FirstRunPanel({
  organizationId,
  orgName,
  steps,
  planIsNone,
}: {
  organizationId: string;
  orgName: string;
  steps: FirstRunStep[];
  planIsNone: boolean;
}) {
  const [skipped, setSkipped] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setSkipped(localStorage.getItem(skipKey(organizationId)) === "1");
    } catch {
      // ignore storage errors (private mode, etc.)
    }
    setReady(true);
  }, [organizationId]);

  function handleSkip() {
    try {
      localStorage.setItem(skipKey(organizationId), "1");
    } catch {
      // ignore
    }
    setSkipped(true);
  }

  const critical = steps.filter((s) => s.critical);
  const doneCount = critical.filter((s) => s.done).length;
  const total = critical.length || 1;
  const next = critical.find((s) => !s.done);
  const allDone = critical.every((s) => s.done);

  // Avoid flash: hide until we know skip state; then honor skip / allDone
  if (!ready || skipped || allDone) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-sky-50 via-white to-slate-50 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
              First 10 minutes · {orgName}
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Get your first inquiry handled automatically
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Connect your inbox, add one rule, then switch on auto-reply. That
              loop is the core of JNS.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Skip for now
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all"
              style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            {doneCount}/{total}
          </span>
        </div>
      </div>

      <ol className="divide-y divide-slate-100">
        {critical.map((step, index) => {
          const isNext = next?.id === step.id;
          return (
            <li
              key={step.id}
              className={`flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap sm:px-6 ${
                isNext ? "bg-sky-50/70" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {step.done ? (
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                ) : (
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isNext
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.done ? "text-slate-400 line-through" : "text-slate-900"
                    }`}
                  >
                    {step.title}
                    {isNext && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-sky-600">
                        Do this next
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                    isNext
                      ? "bg-sky-600 text-white hover:bg-sky-700"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {step.actionLabel}
                  {isNext ? <ArrowRight className="h-3.5 w-3.5" /> : null}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3 sm:px-6">
        {planIsNone ? (
          <p className="text-xs text-slate-500">
            Contacts, bookings, email rules, and auto-reply work on the free
            tier. Upgrade under{" "}
            <Link
              href="/dashboard/billing"
              className="font-medium text-slate-800 underline underline-offset-2"
            >
              Billing
            </Link>{" "}
            when you need team seats, SMS reminders, or higher limits.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            You can finish this later — explore the rest of the workspace
            anytime.
          </p>
        )}
        <button
          type="button"
          onClick={handleSkip}
          className="shrink-0 text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
        >
          Skip setup and explore
        </button>
      </div>
    </section>
  );
}
