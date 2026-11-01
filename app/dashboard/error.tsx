"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
        Something went wrong
      </p>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">
        This page couldn&apos;t load
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        A temporary error stopped this screen. Try again. If it keeps happening,
        open Support or refresh the browser.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-slate-400">
          Ref: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="min-h-[44px] rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to Today
        </Link>
        <Link
          href="/support"
          className="text-sm font-medium text-slate-600 underline underline-offset-2"
        >
          Support
        </Link>
      </div>
    </div>
  );
}
