"use client";

import { useState, useTransition } from "react";
import { createOrganization } from "@/app/onboarding/setup-business/actions";
import { BrandMark } from "@/components/brand-mark";
import { NICHE_OPTIONS, type NicheKey } from "@/lib/niches/kits";

export function SetupBusinessClient() {
  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState<NicheKey | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createOrganization(
        businessName,
        niche || "general",
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.next;
    });
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-5 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-[440px]">
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
            Pick a niche so we can pre-load the right pipeline, forms, and
            labels. You can change everything later.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
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

            <div>
              <p className="text-sm font-medium text-zinc-700">
                What kind of business?
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Optional — defaults to a general service pipeline.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {NICHE_OPTIONS.map((opt) => {
                  const selected = niche === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setNiche((prev) => (prev === opt.key ? "" : opt.key))
                      }
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        selected
                          ? "border-[#0B132B] bg-zinc-50 ring-1 ring-[#0B132B]"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <span className="block text-sm font-medium text-zinc-900">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
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
            Your workspace opens with a ready pipeline, intake form, and email
            booking confirmations — no extra setup required.
          </p>
        </div>
      </div>
    </div>
  );
}
