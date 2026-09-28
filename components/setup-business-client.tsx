"use client";

import { useState, useTransition } from "react";
import { createOrganization } from "@/app/onboarding/setup-business/actions";
import { BrandMark } from "@/components/brand-mark";

export function SetupBusinessClient() {
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createOrganization(businessName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.next;
    });
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <BrandMark />
          <p className="mt-4 text-sm text-zinc-500">Set up your workspace</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900">
            Name your business
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            This creates the workspace. You can invite your team after.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="businessName"
                className="text-sm font-medium text-zinc-700"
              >
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Studio name"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
            >
              {isPending ? "Setting up…" : "Create workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
