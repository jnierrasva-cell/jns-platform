type PrimaryButtonProps = {
  children: React.ReactNode;
};

export default function PrimaryButton({
  children,
}: PrimaryButtonProps) {
  return (
    <button className="rounded-lg bg-slate-900 px-5 py-3 text-white transition hover:bg-slate-800">
      {children}
    </button>
  );
}