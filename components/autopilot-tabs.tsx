"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";

export type AutopilotTab = "status" | "rules" | "templates" | "unmatched";

const TAB_ITEMS: { value: AutopilotTab; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "rules", label: "Rules" },
  { value: "templates", label: "Templates" },
  { value: "unmatched", label: "Unmatched" },
];

export function AutopilotTabs({
  activeTab,
  children,
}: {
  activeTab: AutopilotTab;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(value) => {
        if (typeof value === "string") {
          router.push(`/dashboard/autopilot?tab=${value}`, { scroll: false });
        }
      }}
      className="min-w-0"
    >
      <div className="mb-6 border-b border-border">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          Autopilot
        </p>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Inbox automation
        </h1>
        <Tabs.List aria-label="Autopilot sections" className="mt-3">
          {TAB_ITEMS.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </div>
      {TAB_ITEMS.map((tab) => (
        <Tabs.Panel key={tab.value} value={tab.value}>
          {activeTab === tab.value ? children : null}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}