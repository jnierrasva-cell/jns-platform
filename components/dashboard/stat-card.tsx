interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#2c3140] bg-[#1b1f29] p-5">
      <p className="text-xs uppercase tracking-wide text-[#a8a6a0] font-mono mb-2">
        {label}
      </p>
      <p className="text-2xl font-semibold text-[#edeae3] tracking-tight">
        {value}
      </p>
      {hint && <p className="text-xs text-[#a8a6a0] mt-1">{hint}</p>}
    </div>
  );
}