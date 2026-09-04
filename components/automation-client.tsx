"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Service } from "@/lib/mock-services";
import { ServiceCard } from "@/components/service-card";
import { setAutomationEnabled } from "@/app/dashboard/automation/actions";

export function AutomationClient({
  organizationId,
  services,
  initialEnabledKeys,
}: {
  organizationId: string;
  services: Service[];
  initialEnabledKeys: string[];
}) {
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(
    () => new Set(initialEnabledKeys),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleService(service: Service) {
    if (service.status === "coming_soon") return;

    const nextEnabled = !enabledKeys.has(service.id);
    setError(null);

    // Optimistic UI
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (nextEnabled) next.add(service.id);
      else next.delete(service.id);
      return next;
    });

    startTransition(async () => {
      try {
        await setAutomationEnabled(organizationId, service.id, nextEnabled);
      } catch (err) {
        // Revert on failure
        setEnabledKeys((prev) => {
          const next = new Set(prev);
          if (nextEnabled) next.delete(service.id);
          else next.add(service.id);
          return next;
        });
        setError(err instanceof Error ? err.message : "Could not update");
      }
    });
  }

  const categories = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const service of services) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }
    return Array.from(map.entries());
  }, [services]);

  const activeCount = enabledKeys.size;

  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        Automation
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Your systems
      </h1>
      <p className="mt-1 text-sm text-[#94A3B8]">
        {activeCount} of {services.length} systems switched on.
        {isPending ? " Saving…" : ""}
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex flex-col gap-10">
        {categories.map(([category, categoryServices]) => (
          <section key={category}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
              {category}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryServices.map((service) => (
                <div key={service.id} className="flex flex-col gap-2">
                  <ServiceCard
                    service={service}
                    isOn={enabledKeys.has(service.id)}
                    onToggle={() => toggleService(service)}
                  />
                  {service.id === "email-auto-ack" && (
                    <Link
                      href="/dashboard/templates"
                      className="text-xs text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD]"
                    >
                      Edit reply template
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}