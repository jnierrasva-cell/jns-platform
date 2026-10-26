import Link from "next/link";
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

export function FirstRunPanel({
  orgName,
  steps,
  planIsNone,
}: {
  orgName: string;
  steps: FirstRunStep[];
  planIsNone: boolean;
}) {
  const critical = steps.filter((s) => s.critical);
  const doneCount = critical.filter((s) => s.done).length;
  const total = critical.length || 1;
  const next = critical.find((s) => !s.done);
  const allDone = critical.every((s) => s.done);

  if (allDone) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 bg-[#0B132B] px-5 py-5 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
          First 10 minutes · {orgName}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
          Get one inquiry handled automatically
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
          Connect the inbox, turn on auto-reply, and add one rule. That loop is
          the core of JNS—everything else builds on it.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-sky-400 transition-all"
              style={{ width: `${Math.round((doneCount / total) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-slate-300">
            {doneCount}/{total} core
          </span>
        </div>
      </div>

      <ol className="divide-y divide-zinc-100">
        {critical.map((step, index) => {
          const isNext = next?.id === step.id;
          return (
            <li
              key={step.id}
              className={`flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap sm:px-6 ${
                isNext ? "bg-sky-50/60" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {step.done ? (
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isNext
                        ? "bg-[#0B132B] text-white"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.done ? "text-zinc-500 line-through" : "text-zinc-900"
                    }`}
                  >
                    {step.title}
                    {isNext && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                        Do this next
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                    {step.description}
                  </p>
                </div>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isNext
                      ? "bg-[#0B132B] text-white hover:bg-[#111e3a]"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
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

      {planIsNone && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3 text-xs text-zinc-500 sm:px-6">
          Some automation features need a paid plan. Explore free—when ready,
          open{" "}
          <Link
            href="/dashboard/billing"
            className="font-medium text-zinc-800 underline underline-offset-2"
          >
            Billing
          </Link>
          .
        </div>
      )}
    </section>
  );
}