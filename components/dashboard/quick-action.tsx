type QuickActionProps = {
  title: string;
  description: string;
};

export default function QuickAction({
  title,
  description,
}: QuickActionProps) {
  return (
    <button className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-lg">
      <h3 className="font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </button>
  );
}