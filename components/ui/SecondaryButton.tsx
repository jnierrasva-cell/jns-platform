type SecondaryButtonProps = {
  children: React.ReactNode;
};

export default function SecondaryButton({
  children,
}: SecondaryButtonProps) {
  return (
    <button className="rounded-lg border border-slate-300 px-5 py-3 text-slate-700 transition hover:bg-slate-100">
      {children}
    </button>
  );
}