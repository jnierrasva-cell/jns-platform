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
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-[image:var(--accent-gradient)] px-4 py-2.5 text-sm font-semibold text-[#0A0E1A] hover:brightness-110";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center text-card-foreground">
      {Icon ? (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface-inset text-text-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <h2 className="font-heading text-base font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
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
              className="inline-flex min-h-11 items-center text-sm font-medium text-text-secondary underline underline-offset-2 hover:text-foreground"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}