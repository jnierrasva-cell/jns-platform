import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-xl border border-input bg-surface-inset px-3.5 py-2.5 text-[15px] leading-5 text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}