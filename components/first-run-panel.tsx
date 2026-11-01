import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SetupProgressRing } from "@/components/setup-progress-ring";

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
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-5 border-b border-border bg-surface-inset px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            First 10 minutes · {orgName}
          </p>
          <h2 className="mt-2 font-heading text-lg font-bold text-foreground sm:text-xl">
            Get one inquiry handled automatically
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
            Connect the inbox, turn on auto-reply, and add one rule. That loop is
            the core of JNS. Everything else builds on it.
          </p>
        </div>
        <SetupProgressRing done={doneCount} total={total} />
      </div>

      <ol className="divide-y divide-border">
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
                        ? "bg-accent-cyan text-[#0A0E1A]"
                        : "bg-surface-inset text-text-muted"
                    }`}
                  >
                    {index + 1}
                  </span>
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      step.done ? "text-text-muted line-through" : "text-foreground"
                    }`}
                  >
                    {step.title}
                    {isNext && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-accent-cyan">
                        Do this next
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-text-secondary">
                    {step.description}
                  </p>
                </div>
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isNext
                      ? "bg-[image:var(--accent-gradient)] text-[#0A0E1A] hover:brightness-110"
                      : "border border-border bg-card text-foreground hover:bg-muted"
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
        <div className="border-t border-border bg-surface-inset px-5 py-3 text-xs text-text-secondary sm:px-6">
          Some automation features need a paid plan. Explore free—when ready,
          open{" "}
          <Link
            href="/dashboard/billing"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Billing
          </Link>
          .
        </div>
      )}
    </section>
  );
}