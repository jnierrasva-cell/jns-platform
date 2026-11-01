type PrimaryButtonProps = {
  children: React.ReactNode;
};

export default function PrimaryButton({
  children,
}: PrimaryButtonProps) {
  return (
    <button className="min-h-[44px] rounded-xl bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700">
      {children}
    </button>
  );
}
