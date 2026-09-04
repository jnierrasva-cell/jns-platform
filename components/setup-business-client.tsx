"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { createOrganization } from "@/app/onboarding/setup-business/actions";

export function SetupBusinessClient() {
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createOrganization(businessName);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="relative flex min-h-full items-center justify-center bg-[#0B132B] px-6 py-16">
      {/* Soft ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[40%] h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563EB]/12 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[380px]">
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
          <p className="mt-4 text-sm text-[#94A3B8]">
            Set up your workspace
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <h1 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-white">
            Set up your business
          </h1>
          <p className="mt-1.5 text-sm text-[#94A3B8]">
            This creates your workspace. You’ll be able to invite your team
            next.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="businessName"
                className="text-sm font-medium text-[#E2E8F0]"
              >
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="ilovemypilates"
                className="rounded-lg border border-white/15 bg-[#0B132B]/70 px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/35"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="mt-1 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all hover:bg-[#1D4ED8] hover:shadow-[#2563EB]/40 disabled:opacity-60"
            >
              {isPending ? "Setting up…" : "Create workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}