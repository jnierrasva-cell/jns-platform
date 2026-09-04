import type { ServiceStatus } from "@/lib/mock-services";

const STYLES: Record<ServiceStatus, string> = {
  active: "border-[#2563EB]/40 bg-[#2563EB]/15 text-[#93C5FD]",
  available: "border-[#06B6D4]/30 bg-[#06B6D4]/10 text-[#67E8F9]",
  coming_soon: "border-white/10 bg-white/[0.04] text-[#64748B]",
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