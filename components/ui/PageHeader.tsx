type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
}: PageHeaderProps) {
  return (
    <div className="border-b border-slate-200/80 pb-6">
      {eyebrow ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
