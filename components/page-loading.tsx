export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div>
        <div className="h-3 w-20 rounded bg-zinc-200" />
        <div className="mt-3 h-8 w-48 max-w-full rounded bg-zinc-200" />
        <div className="mt-2 h-4 w-72 max-w-full rounded bg-zinc-100" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-24 rounded-xl border border-zinc-100 bg-zinc-100/80" />
        <div className="h-24 rounded-xl border border-zinc-100 bg-zinc-100/80" />
        <div className="hidden h-24 rounded-xl border border-zinc-100 bg-zinc-100/80 lg:block" />
      </div>
      <div className="h-40 rounded-xl border border-zinc-100 bg-zinc-50" />
      <p className="text-center text-xs text-zinc-400">{label}</p>
    </div>
  );
}
