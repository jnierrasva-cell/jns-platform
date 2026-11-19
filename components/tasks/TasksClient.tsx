"use client";

export function TasksClient(_props: Record<string, unknown>) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
      <p className="mt-2 text-sm text-slate-500">
        Task module is deploying. Refresh in a moment if this message remains.
      </p>
    </div>
  );
}
