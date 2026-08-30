"use client";

import type { Service } from "@/lib/mock-services";
import { BreakerSwitch } from "@/components/breaker-switch";
import { StatusBadge } from "@/components/status-badge";

type ServiceCardProps = {
  service: Service;
  isOn: boolean;
  onToggle: () => void;
};

export function ServiceCard({ service, isOn, onToggle }: ServiceCardProps) {
  const disabled = service.status === "coming_soon";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#E1DFD6] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-medium text-[#1B1D1F]">
            {service.name}
          </h3>
          <div className="mt-1.5">
            <StatusBadge status={service.status} />
          </div>
        </div>
        <BreakerSwitch
          checked={isOn}
          onChange={onToggle}
          disabled={disabled}
          label={`Turn ${service.name} ${isOn ? "off" : "on"}`}
        />
      </div>
      <p className="text-sm leading-relaxed text-[#6B7069]">
        {service.description}
      </p>
    </div>
  );
}
