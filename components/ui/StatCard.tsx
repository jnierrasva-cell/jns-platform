type StatCardProps = {
  title: string;
  value: number | string;
  subtitle: string;
};

export default function StatCard({
  title,
  value,
  subtitle,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <h2 className="mt-3 text-4xl font-bold">
        {value}
      </h2>

      <p className="mt-2 text-sm text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}