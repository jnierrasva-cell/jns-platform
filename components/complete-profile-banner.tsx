"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeProfileNames } from "@/app/dashboard/complete-profile/actions";

export function CompleteProfileBanner() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await completeProfileNames(firstName, lastName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            We never asked for your name
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Add your name to complete your profile.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid w-full gap-2 sm:max-w-xl sm:grid-cols-[1fr_1fr_auto]"
        >
          <div>
            <label className="sr-only" htmlFor="profile-first-name">
              First name
            </label>
            <input
              id="profile-first-name"
              required
              autoComplete="given-name"
              placeholder="First name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0B132B]"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="profile-last-name">
              Last name
            </label>
            <input
              id="profile-last-name"
              required
              autoComplete="family-name"
              placeholder="Last name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0B132B]"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#0B132B] px-4 py-2 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save name"}
          </button>
        </form>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
