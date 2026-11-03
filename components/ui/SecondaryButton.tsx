type SecondaryButtonProps = {
  children: React.ReactNode;
};

export default function SecondaryButton({
  children,
}: SecondaryButtonProps) {
  return (
    <button className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-5 py-3 text-slate-800 transition hover:bg-slate-50">
      {children}
    </button>
  );
}
