"use client";

import { useState, useTransition } from "react";
import { createOrganization } from "@/app/onboarding/setup-business/actions";
import { BrandMark } from "@/components/brand-mark";
import {
  BUSINESS_SIZE_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  type BusinessSizeKey,
  type BusinessTypeKey,
} from "@/lib/niches/business-types";

export function SetupBusinessClient() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessTypeKey | "">("");
  const [businessSize, setBusinessSize] = useState<BusinessSizeKey | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }
    if (!businessType) {
      setError("Choose a business type");
      return;
    }
    if (!businessSize) {
      setError("Choose a business size");
      return;
    }

    startTransition(async () => {
      const result = await createOrganization(
        businessName,
        businessType,
        businessSize,
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
      <div className="w-full max-w-[480px]">
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
            Set up your business workspace
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Tell us a bit about the business. We use this to pre-load a sensible
            pipeline and forms — you can change everything later.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <div>
              <label
                htmlFor="businessName"
                className="text-sm font-medium text-zinc-700"
              >
                Business name
              </label>
              <p className="mt-0.5 text-xs text-zinc-500">
                This becomes your workspace name.
              </p>
              <input
                id="businessName"
                type="text"
                required
                autoFocus
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Harbor Advisory"
                className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-[#0B132B] placeholder:text-zinc-400 focus:border-[#0B132B] focus:ring-1"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-700">Business type</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Closest fit is enough — not locked in forever.
              </p>
              <div className="mt-2 grid gap-2">
                {BUSINESS_TYPE_OPTIONS.map((opt) => {
                  const selected = businessType === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setBusinessType(opt.key)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        selected
                          ? "border-[#0B132B] bg-[#0B132B]/[0.04] ring-1 ring-[#0B132B]"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-zinc-900">
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-700">Business size</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                How many people work in the business today?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {BUSINESS_SIZE_OPTIONS.map((opt) => {
                  const selected = businessSize === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setBusinessSize(opt.key)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        selected
                          ? "border-[#0B132B] bg-[#0B132B]/[0.04] text-zinc-900 ring-1 ring-[#0B132B]"
                          : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      {opt.label}
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
              disabled={
                isPending ||
                !businessName.trim() ||
                !businessType ||
                !businessSize
              }
              className="mt-1 rounded-xl bg-[#0B132B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0B132B]/90 disabled:opacity-50"
            >
              {isPending ? "Creating workspace…" : "Create workspace"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Pipeline, forms, and labels stay editable after setup.
        </p>
      </div>
    </div>
  );
}
