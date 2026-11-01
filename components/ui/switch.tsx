import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Toggle({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      nativeButton
      render={<button type="button" />}
      className={cn(
        "relative flex h-11 w-14 shrink-0 items-center rounded-full bg-transparent px-1 outline-none before:absolute before:left-1 before:top-2 before:h-7 before:w-12 before:rounded-full before:border before:border-border before:bg-surface-inset before:transition-colors before:content-[''] data-checked:before:border-accent-cyan data-checked:before:bg-accent-cyan focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="relative z-10 ml-1 size-5 rounded-full bg-text-muted shadow-sm transition-transform data-checked:translate-x-5 data-checked:bg-[#0A0E1A]" />
    </SwitchPrimitive.Root>
  );
}