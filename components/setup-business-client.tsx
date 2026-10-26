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
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-5 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-8">
          <BrandMark />
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
            Step 2 of 2
          </p>
          <div className="mt-2 flex gap-1.5">
            <span className="h-1 w-10 rounded-full bg-[#0B132B]" />
            <span className="h-1 w-10 rounded-full bg-[#0B132B]" />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Name your workspace
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Use the business or studio name your team will recognize. Invite
            people from Team after this.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="businessName"
                className="text-sm font-medium text-zinc-700"
              >
                Workspace name
              </label>
              <input
                id="businessName"
                type="text"
                required
                autoFocus
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Northside Pilates"
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !businessName.trim()}
              className="w-full rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
            >
              {isPending ? "Creating workspace…" : "Create workspace"}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white/70 px-4 py-3 text-xs leading-5 text-zinc-500">
          <p className="font-medium text-zinc-700">What happens next</p>
          <p className="mt-1">
            Overview opens with three steps: connect Google, turn on auto-reply,
            add one email rule—so the first inquiry is handled cleanly.
          </p>
        </div>
      </div>
    </div>
  );
}