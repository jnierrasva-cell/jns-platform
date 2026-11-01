"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";

export type BottomTabItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
};

export function BottomTabBar({
  items,
  onMore,
  moreOpen,
}: {
  items: BottomTabItem[];
  onMore: () => void;
  moreOpen: boolean;
}) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto grid w-[calc(100%-1.5rem)] max-w-[30rem] grid-cols-5 gap-1 rounded-full border border-border bg-surface/95 p-1.5 text-foreground shadow-[var(--shadow-soft)] backdrop-blur-lg md:hidden"
    >
      {items.map(({ label, href, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-medium leading-3 transition ${
            active
              ? "bg-[image:var(--accent-gradient)] text-[#0A0E1A]"
              : "text-text-muted hover:bg-muted hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="max-w-full truncate">{label}</span>
        </Link>
      ))}
      <button
        type="button"
        aria-expanded={moreOpen}
        onClick={onMore}
        className={`flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-medium leading-3 transition focus-visible:ring-2 focus-visible:ring-ring/50 ${
          moreOpen
            ? "bg-[image:var(--accent-gradient)] text-[#0A0E1A]"
            : "text-text-muted hover:bg-muted hover:text-foreground"
        }`}
      >
        <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
        <span>More</span>
      </button>
    </nav>
  );
}