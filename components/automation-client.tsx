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
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        Automation
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Your systems
      </h1>
      <p className="mt-1 text-sm text-[#94A3B8]">
        {activeCount} of {mockServices.length} systems switched on.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {categories.map(([category, services]) => (
          <section key={category}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
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