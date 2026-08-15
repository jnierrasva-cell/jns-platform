type EmptyStateProps = {
  message: string;
};

export default function EmptyState({
  message,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg bg-slate-50 p-6 text-center text-slate-500">
      {message}
    </div>
  );
}