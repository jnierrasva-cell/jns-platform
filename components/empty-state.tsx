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
    "inline-flex items-center justify-center rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a]";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-14 text-center">
      {Icon ? (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
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
              className="text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}