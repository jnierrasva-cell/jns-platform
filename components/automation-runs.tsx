"use client";

import { useState, useTransition } from "react";
import {
  getWorkflowRunSteps,
  retryWorkflowRun,
} from "@/app/dashboard/automation/run-actions";

export type RunRow = {
  id: string;
  trigger_event: string;
  status: string;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  workflows?: { name: string; key: string } | null;
};

type StepRow = {
  id: string;
  node_id: string;
  action_key: string | null;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusClass(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-800";
  if (status === "failed") return "bg-red-50 text-red-800";
  if (status === "waiting" || status === "skipped")
    return "bg-amber-50 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

export function AutomationRuns({
  organizationId,
  runs,
}: {
  organizationId: string;
  runs: RunRow[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [stepsByRun, setStepsByRun] = useState<Record<string, StepRow[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(runId: string) {
    if (openId === runId) {
      setOpenId(null);
      return;
    }
    setOpenId(runId);
    setLoadError(null);
    if (stepsByRun[runId]) return;
    startTransition(async () => {
      try {
        const steps = await getWorkflowRunSteps(organizationId, runId);
        setStepsByRun((prev) => ({ ...prev, [runId]: steps as StepRow[] }));
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Could not load steps",
        );
      }
    });
  }

  function onRetry(runId: string) {
    setLoadError(null);
    startTransition(async () => {
      try {
        await retryWorkflowRun(organizationId, runId);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Retry failed");
      }
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          Recent workflow runs
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Expand a run to inspect each step. Failed runs can be retried.
        </p>
      </div>
      {loadError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </p>
      ) : null}
      {runs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
          No workflow runs yet. Turn on a recipe and trigger an event (form
          submit or booking status change).
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {runs.map((r) => {
            const name =
              (r.workflows && typeof r.workflows === "object"
                ? r.workflows.name
                : null) || r.trigger_event;
            const open = openId === r.id;
            const steps = stepsByRun[r.id];
            const canRetry =
              r.status === "failed" || r.status === "completed";
            return (
              <li key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      <span className="mr-1.5 text-slate-400">
                        {open ? "▾" : "▸"}
                      </span>
                      {name}
                    </p>
                    <p className="ml-4 text-xs text-slate-500">
                      {r.trigger_event} · {formatWhen(r.started_at)}
                    </p>
                    {r.error ? (
                      <p className="ml-4 mt-1 text-xs text-red-700">{r.error}</p>
                    ) : null}
                  </button>
                  <div className="flex items-center gap-2">
                    {canRetry ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onRetry(r.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Retry
                      </button>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
                {open ? (
                  <div className="ml-4 mt-3 space-y-2 border-l-2 border-slate-100 pl-3">
                    {pending && !steps ? (
                      <p className="text-xs text-slate-500">Loading steps…</p>
                    ) : null}
                    {steps && steps.length === 0 ? (
                      <p className="text-xs text-slate-500">No steps recorded.</p>
                    ) : null}
                    {steps?.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-slate-800">
                            {s.action_key || s.node_id}
                          </p>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusClass(s.status)}`}
                          >
                            {s.status}
                          </span>
                        </div>
                        {s.error ? (
                          <p className="mt-1 text-xs text-red-700">{s.error}</p>
                        ) : null}
                        {s.output && Object.keys(s.output).length > 0 ? (
                          <pre className="mt-1 max-h-24 overflow-auto text-[10px] text-slate-500">
                            {JSON.stringify(s.output, null, 0)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
