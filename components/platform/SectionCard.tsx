type SectionCardProps = {
  title: string;
  children: React.ReactNode;
};

export default function SectionCard({
  title,
  children,
}: SectionCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}