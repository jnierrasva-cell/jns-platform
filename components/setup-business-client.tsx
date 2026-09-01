"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
    <div className="flex min-h-full items-center justify-center bg-[#F6F5F1] px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-[#1B1D1F]"
          >
            JNSystem
          </Link>
        </div>

        <div className="rounded-lg border border-[#E1DFD6] bg-white p-8">
          <h1 className="text-lg font-medium text-[#1B1D1F]">
            Set up your business
          </h1>
          <p className="mt-1.5 text-sm text-[#6B7069]">
            This creates your workspace. You'll be able to invite your team
            next.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="businessName" className="text-sm text-[#1B1D1F]">
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="ilovemypilates"
                className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
              />
            </div>

            {error && <p className="text-sm text-[#B3432B]">{error}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 rounded-md bg-[#1F4D42] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#163B33] disabled:opacity-60"
            >
              {isPending ? "Setting up…" : "Create workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}