"use client";

import { useState, useTransition } from "react";
import { Building2, User } from "lucide-react";
import { setAccountType } from "@/app/onboarding/account-type/actions";
import { BrandMark } from "@/components/brand-mark";

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
    <div className="flex min-h-full items-center justify-center bg-[#0B132B] px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <BrandMark />
          <p className="mt-4 text-sm text-[#94A3B8]">Almost ready</p>
        </div>

        <div className="jns-card p-6">
          <h1 className="text-lg font-semibold text-white">How will you use JNS?</h1>
          <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
            This sets up the right workspace. You can still run the same tools
            either way.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => choose("individual")}
              className="rounded-lg border border-[#1e2a4a] p-4 text-left transition hover:bg-[#111e3a] disabled:opacity-60"
            >
              <User className="h-4 w-4 text-[#2563EB]" />
              <p className="mt-3 text-sm font-medium text-white">Individual</p>
              <p className="mt-1 text-xs leading-5 text-[#94A3B8]">
                Solo use — we create a personal workspace for you.
              </p>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => choose("business")}
              className="rounded-lg border border-[#1e2a4a] p-4 text-left transition hover:bg-[#111e3a] disabled:opacity-60"
            >
              <Building2 className="h-4 w-4 text-[#2563EB]" />
              <p className="mt-3 text-sm font-medium text-white">Business</p>
              <p className="mt-1 text-xs leading-5 text-[#94A3B8]">
                Company or team — name your business next.
              </p>
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
          {isPending && <p className="mt-4 text-xs text-[#94A3B8]">Setting up…</p>}
        </div>
      </div>
    </div>
  );
}
