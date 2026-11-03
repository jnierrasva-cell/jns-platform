export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div>
        <div className="h-3 w-20 rounded-full bg-slate-200/80" />
        <div className="mt-3 h-8 w-48 max-w-full rounded-xl bg-slate-200/80" />
        <div className="mt-2 h-4 w-72 max-w-full rounded-lg bg-slate-100" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-24 rounded-2xl border border-slate-100 bg-white shadow-sm" />
        <div className="h-24 rounded-2xl border border-slate-100 bg-white shadow-sm" />
        <div className="hidden h-24 rounded-2xl border border-slate-100 bg-white shadow-sm lg:block" />
      </div>
      <div className="h-40 rounded-2xl border border-slate-100 bg-white shadow-sm" />
      <p className="text-center text-xs text-slate-400">{label}</p>
    </div>
  );
}
