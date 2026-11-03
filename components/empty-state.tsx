import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  href,
  secondaryLabel,
  secondaryHref,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  const actionClass =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600 ring-1 ring-sky-100">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
      {(actionLabel && (onAction || href)) ||
      (secondaryLabel && secondaryHref) ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && href ? (
            <Link href={href} className={actionClass}>
              {actionLabel}
            </Link>
          ) : null}
          {actionLabel && onAction && !href ? (
            <button type="button" onClick={onAction} className={actionClass}>
              {actionLabel}
            </button>
          ) : null}
          {secondaryLabel && secondaryHref ? (
            <Link
              href={secondaryHref}
              className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
