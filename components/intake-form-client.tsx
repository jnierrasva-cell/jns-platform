"use client";

import { useMemo, useState, useTransition } from "react";
import { CountryPhoneInput } from "@/components/country-phone-input";
import { submitIntakeForm } from "@/app/forms/[orgSlug]/[formSlug]/actions";
import type { FormField } from "@/lib/forms/fields";

export function IntakeFormClient({
  organizationId,
  formId,
  businessName,
  logoUrl,
  formName,
  headline,
  description,
  successMessage,
  fields,
}: {
  organizationId: string;
  formId: string;
  businessName: string;
  logoUrl?: string | null;
  formName: string;
  headline?: string | null;
  description?: string | null;
  successMessage: string | null;
  fields: FormField[];
}) {
  const enabledFields = useMemo(
    () => (fields || []).filter((f) => f.enabled !== false),
    [fields],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setField(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    for (const field of enabledFields) {
      const v = (values[field.id] || "").trim();
      if (field.required && !v) {
        setError(`${field.label} is required`);
        return;
      }
      if (field.type === "email" && v && !v.includes("@")) {
        setError("Enter a valid email");
        return;
      }
    }

    startTransition(async () => {
      try {
        await submitIntakeForm({
          organizationId,
          formId,
          responses: values,
        });
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not submit");
      }
    });
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
        {children}
        <p className="mt-8 text-center text-[11px] text-slate-400">
          Powered by JNS
        </p>
      </div>
    </div>
  );

  const brandHeader = (
    <div className="flex flex-col items-center text-center">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={businessName}
          className="mb-4 max-h-14 w-auto max-w-[200px] object-contain"
        />
      ) : (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {businessName}
        </p>
      )}
      {logoUrl ? (
        <p className="text-sm font-medium text-slate-600">{businessName}</p>
      ) : null}
    </div>
  );

  if (done) {
    return shell(
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
        {brandHeader}
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
          Thank you
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {successMessage ||
            "We received your submission and will be in touch."}
        </p>
      </div>,
    );
  }

  return shell(
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      {brandHeader}
      <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight text-slate-900">
        {headline?.trim() || formName}
      </h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
        {description?.trim() ||
          `Send a message to ${businessName}. We’ll follow up soon.`}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {enabledFields.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              {field.label}
              {field.required ? (
                <span className="text-slate-400"> *</span>
              ) : null}
            </label>
            {field.type === "textarea" ? (
              <textarea
                value={values[field.id] || ""}
                onChange={(e) => setField(field.id, e.target.value)}
                rows={4}
                required={field.required}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            ) : field.type === "phone" ? (
              <div className="rounded-xl border border-slate-200 bg-white px-1 py-1">
                <CountryPhoneInput
                  value={values[field.id] || ""}
                  onChange={(v) => setField(field.id, v)}
                />
              </div>
            ) : (
              <input
                type={field.type === "email" ? "email" : "text"}
                value={values[field.id] || ""}
                onChange={(e) => setField(field.id, e.target.value)}
                required={field.required}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            )}
          </div>
        ))}

        {error && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60 min-h-[44px]"
        >
          {isPending ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>,
  );
}
