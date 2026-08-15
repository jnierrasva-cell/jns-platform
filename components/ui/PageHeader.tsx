type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
}: PageHeaderProps) {
  return (
    <div className="mb-10">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        {eyebrow}
      </p>

      <h1 className="mt-2 text-4xl font-bold">
        {title}
      </h1>

      <p className="mt-3 text-slate-600">
        {description}
      </p>
    </div>
  );
}