"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mockServices } from "@/lib/mock-services";
import { ServiceCard } from "@/components/service-card";

export function AutomationClient() {
  const [activeIds, setActiveIds] = useState<Set<string>>(
    () =>
      new Set(
        mockServices.filter((s) => s.status === "active").map((s) => s.id),
      ),
  );

  function toggleService(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const categories = useMemo(() => {
    const map = new Map<string, typeof mockServices>();
    for (const service of mockServices) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }
    return Array.from(map.entries());
  }, []);

  const activeCount = activeIds.size;

  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
        Automation
      </span>
      <h1 className="text-2xl font-medium text-[#1B1D1F]">Your systems</h1>
      <p className="mt-1 text-sm text-[#6B7069]">
        {activeCount} of {mockServices.length} systems switched on.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {categories.map(([category, services]) => (
          <section key={category}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
              {category}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <div key={service.id} className="flex flex-col gap-2">
                  <ServiceCard
                    service={service}
                    isOn={activeIds.has(service.id)}
                    onToggle={() => toggleService(service.id)}
                  />
                  {service.id === "email-auto-ack" && (
                    <Link
                      href="/dashboard/templates"
                      className="text-xs text-[#1F4D42] underline underline-offset-2"
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