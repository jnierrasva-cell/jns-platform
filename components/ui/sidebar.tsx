import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Sidebar({
  className,
  ...props
}: ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col border-r border-border bg-surface-inset text-foreground",
        className,
      )}
      {...props}
    />
  );
}