type StatCardProps = {
  title: string;
  value: string | number;
  valueColor?: string;
};

export default function StatCard({
  title,
  value,
  valueColor = "text-slate-900",
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>

      <h2 className={`mt-3 text-3xl font-bold ${valueColor}`}>
        {value}
      </h2>
    </div>
  );
}