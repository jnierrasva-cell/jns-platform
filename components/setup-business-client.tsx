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
      try {
        await createOrganization(businessName);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-6 py-16">
      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <BrandMark />
          <p className="mt-4 text-sm text-zinc-500">Set up your workspace</p>
        </div>

        <div className="jns-card p-6">
          <h1 className="text-lg font-semibold text-zinc-900">Name your business</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            This creates the workspace. You can invite your team after.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="businessName" className="jns-label">
                Business name
              </label>
              <input
                id="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Studio name"
                className="jns-input"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={isPending} className="jns-btn">
              {isPending ? "Setting up…" : "Create workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
