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
      const result = await setAccountType(type);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.next;
    });
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-50 px-5 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <BrandMark />
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
            Step 1 of 2
          </p>
          <div className="mt-2 flex gap-1.5">
            <span className="h-1 w-10 rounded-full bg-[#0B132B]" />
            <span className="h-1 w-10 rounded-full bg-zinc-200" />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            How will you use JNS?
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Pick the closest fit. You get a workspace either way—tools stay the
            same. You can invite people later from Team.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => choose("individual")}
              className="group rounded-xl border border-zinc-200 p-4 text-left transition hover:border-[#0B132B]/40 hover:bg-zinc-50 disabled:opacity-60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 group-hover:bg-[#0B132B] group-hover:text-white">
                <User className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-semibold text-zinc-900">
                Individual
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Solo operator or VA. We create a personal workspace now.
              </p>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => choose("business")}
              className="group rounded-xl border border-zinc-200 p-4 text-left transition hover:border-[#0B132B]/40 hover:bg-zinc-50 disabled:opacity-60"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 group-hover:bg-[#0B132B] group-hover:text-white">
                <Building2 className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-semibold text-zinc-900">Business</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Studio or team. Next you name the workspace, then invite staff.
              </p>
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {isPending && (
            <p className="mt-4 text-sm text-zinc-500">Setting up…</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Takes under a minute. You can change how you work inside the app.
        </p>
      </div>
    </div>
  );
}