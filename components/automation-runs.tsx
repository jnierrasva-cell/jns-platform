type RunRow = {
  id: string;
  trigger_event: string;
  status: string;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  workflows?: { name: string; key: string } | null;
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

export function AutomationRuns({ runs }: { runs: RunRow[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          Recent workflow runs
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Last executions from recipes and scheduled automations.
        </p>
      </div>
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
            const statusColor =
              r.status === "completed"
                ? "bg-emerald-50 text-emerald-800"
                : r.status === "failed"
                  ? "bg-red-50 text-red-800"
                  : r.status === "waiting"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-slate-100 text-slate-700";
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">
                    {r.trigger_event} · {formatWhen(r.started_at)}
                  </p>
                  {r.error ? (
                    <p className="mt-1 text-xs text-red-700">{r.error}</p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}
                >
                  {r.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
