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
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
        Something went wrong
      </p>
      <h1 className="mt-2 text-xl font-semibold text-zinc-900">
        This page couldn&apos;t load
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        A temporary error stopped this screen. Try again. If it keeps happening,
        open Support or refresh the browser.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-zinc-400">
          Ref: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a]"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          Back to Overview
        </Link>
        <Link
          href="/support"
          className="text-sm font-medium text-zinc-600 underline underline-offset-2"
        >
          Support
        </Link>
      </div>
    </div>
  );
}
