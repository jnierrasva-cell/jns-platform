import type { ServiceStatus } from "@/lib/mock-services";

const STYLES: Record<ServiceStatus, string> = {
  active: "border-[#E9CFA0] bg-[#F6E9D3] text-[#8A5A16]",
  available: "border-[#CFE0D9] bg-[#EAF1EE] text-[#1F4D42]",
  coming_soon: "border-[#E1DFD6] bg-[#F1F0EB] text-[#6B7069]",
};

const LABELS: Record<ServiceStatus, string> = {
  active: "Active",
  available: "Available",
  coming_soon: "Coming soon",
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}

