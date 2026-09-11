"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, User } from "lucide-react";
import { setAccountType } from "@/app/onboarding/account-type/actions";

export function AccountTypeClient() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function choose(type: "individual" | "business") {
    setError(null);
    startTransition(async () => {
      try {
        await setAccountType(type);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="relative flex min-h-full items-center justify-center bg-[#0B132B] px-6 py-16">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[40%] h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563EB]/12 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/jns-logo.png"
              alt="JNS Platform"
              width={160}
              height={60}
              className="mx-auto h-12 w-auto"
              priority
            />
          </Link>
          <p className="mt-4 text-sm text-[#94A3B8]">Almost ready</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <h1 className="text-xl font-semibold text-white">
            How will you use JNS?
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This helps us set up the right workspace. You can still run tools
            either way — we just isolate business vs personal use.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => choose("individual")}
              className="rounded-xl border border-white/12 bg-[#0B132B]/60 p-5 text-left transition hover:border-cyan-300/40 hover:bg-white/[0.04] disabled:opacity-60"
            >
              <User className="h-5 w-5 text-cyan-300" />
              <p className="mt-3 font-medium text-white">Individual</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Solo use — we create a personal workspace for you.
              </p>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => choose("business")}
              className="rounded-xl border border-white/12 bg-[#0B132B]/60 p-5 text-left transition hover:border-cyan-300/40 hover:bg-white/[0.04] disabled:opacity-60"
            >
              <Building2 className="h-5 w-5 text-cyan-300" />
              <p className="mt-3 font-medium text-white">Business</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Company or team — name your business next.
              </p>
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          {isPending && (
            <p className="mt-4 text-xs text-slate-500">Setting up…</p>
          )}
        </div>
      </div>
    </div>
  );
}