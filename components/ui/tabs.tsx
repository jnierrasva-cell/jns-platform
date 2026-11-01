import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex min-w-0 gap-1 overflow-x-auto border-b border-border",
        className,
      )}
      {...props}
    />
  );
}

function TabsTab({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-medium text-text-muted outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-active:border-accent-cyan data-active:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsPanel({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      className={cn("min-w-0 outline-none", className)}
      {...props}
    />
  );
}

export const Tabs = {
  Root: TabsPrimitive.Root,
  List: TabsList,
  Tab: TabsTab,
  Indicator: TabsPrimitive.Indicator,
  Panel: TabsPanel,
};