"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mockServices } from "@/lib/mock-services";
import { ServiceCard } from "@/components/service-card";

// Placeholder workspace name. Real client identity arrives with Supabase
// auth in Step 2 — swap this for the authenticated user's business name.
const WORKSPACE_NAME = "Studio Workspace";

export default function DashboardPage() {
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
    <div className="min-h-full bg-[#F6F5F1]">
      {/* Top bar */}
      <header className="border-b border-[#E1DFD6] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-mono text-sm tracking-tight text-[#1B1D1F]">
            JNSystem
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#6B7069]">{WORKSPACE_NAME}</span>
            <div className="h-8 w-8 rounded-full border border-[#E1DFD6] bg-[#EAF1EE]" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
            Service catalog
          </span>
          <h1 className="text-2xl font-medium text-[#1B1D1F]">
            Your systems
          </h1>
          <p className="mt-1 text-sm text-[#6B7069]">
            {activeCount} of {mockServices.length} systems switched on. Turn
            any one on or off — changes take effect immediately.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-10">
          {categories.map(([category, services]) => (
            <section key={category}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isOn={activeIds.has(service.id)}
                    onToggle={() => toggleService(service.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
