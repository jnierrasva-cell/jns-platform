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
    <div className="mb-8">
      <p className="jns-kicker">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        {title}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
    </div>
  );
}
