"use client";

import { useState, useTransition } from "react";
import { submitIntakeForm } from "@/app/forms/[orgSlug]/[formSlug]/actions";
import { CountryPhoneInput } from "@/components/country-phone-input";

export function IntakeFormClient({
  organizationId,
  formId,
  businessName,
  formName,
  successMessage,
}: {
  organizationId: string;
  formId: string;
  businessName: string;
  formName: string;
  successMessage: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await submitIntakeForm({
          organizationId,
          formId,
          name,
          email,
          phone,
          message,
        });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B132B] px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#101a37]/75 p-8 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            Submitted
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Thank you
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B132B] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#101a37]/75 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          {businessName}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          {formName}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Share a few details and we’ll follow up with you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-200">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-200">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-200">
              Phone (optional)
            </label>
            <CountryPhoneInput value={phone} onChange={setPhone} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-200">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/50 transition hover:bg-blue-500 disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}