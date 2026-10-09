import type { ServiceStatus } from "@/lib/mock-services";

const STYLES: Record<ServiceStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  available: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

const LABELS: Record<ServiceStatus, string> = {
  active: "On",
  available: "Available",
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}