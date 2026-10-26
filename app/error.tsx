"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
          Error
        </p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          We hit an unexpected problem. You can try again or return home.
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
            href="/"
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
