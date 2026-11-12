import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Optional back navigation shown above the eyebrow/title */
  backHref?: string;
  backLabel?: string;
  /** Right-side actions (buttons, links) — stacks under title on small screens */
  actions?: React.ReactNode;
  className?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`border-b border-slate-200/80 pb-6 ${className}`.trim()}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
