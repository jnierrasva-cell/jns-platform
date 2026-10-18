"use client";

import { useMemo, useState, useTransition } from "react";
import { CountryPhoneInput } from "@/components/country-phone-input";
import { submitIntakeForm } from "@/app/forms/[orgSlug]/[formSlug]/actions";
import type { FormField } from "@/app/dashboard/forms/actions";

export function IntakeFormClient({
  organizationId,
  formId,
  businessName,
  formName,
  headline,
  description,
  successMessage,
  fields,
}: {
  organizationId: string;
  formId: string;
  businessName: string;
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

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-xs uppercase tracking-wide text-cyan-300/80">
          {businessName}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Thank you</h1>
        <p className="mt-3 text-sm text-slate-300">
          {successMessage ||
            "We received your submission and will be in touch."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-cyan-300/80">
        {businessName}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-white">
        {headline?.trim() || formName}
      </h1>
      {(description?.trim() || !headline) && (
        <p className="mt-2 text-sm text-slate-300">
          {description?.trim() ||
            `Send a message to ${businessName}. We’ll follow up soon.`}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {enabledFields.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-200">
              {field.label}
              {field.required ? " *" : ""}
            </label>
            {field.type === "textarea" ? (
              <textarea
                value={values[field.id] || ""}
                onChange={(e) => setField(field.id, e.target.value)}
                rows={4}
                required={field.required}
                className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white outline-none focus:border-cyan-300/70"
              />
            ) : field.type === "phone" ? (
              <CountryPhoneInput
                value={values[field.id] || ""}
                onChange={(v) => setField(field.id, v)}
              />
            ) : (
              <input
                type={field.type === "email" ? "email" : "text"}
                value={values[field.id] || ""}
                onChange={(e) => setField(field.id, e.target.value)}
                required={field.required}
                className="rounded-lg border border-white/15 bg-[#0B132B]/80 px-3.5 py-3 text-sm text-white outline-none focus:border-cyan-300/70"
              />
            )}
          </div>
        ))}

        {error && (
          <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3.5 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#0B132B] disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Submit"}
        </button>
      </form>
    </div>
  );
}