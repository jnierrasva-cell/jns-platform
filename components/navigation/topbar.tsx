export default function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          JNS PLATFORM
        </p>

        <h1 className="text-lg font-semibold text-slate-900">
          Build. Improve. Scale.
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">
          Notifications
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          J
        </div>
      </div>
    </header>
  );
}