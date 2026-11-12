"use client";

import Link from "next/link";
import { FileInput, Link2, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useState, useTransition } from "react";
import {
  createIntakeForm,
  updateIntakeForm,
  duplicateIntakeForm,
  exportFormSubmissionsCsv,
} from "@/app/dashboard/forms/actions";
import {
  DEFAULT_FORM_FIELDS,
  type FormField,
} from "@/lib/forms/fields";

type FormRow = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  success_message: string;
  created_at: string;
  headline?: string | null;
  description?: string | null;
  fields?: FormField[];
  submission_count: number;
};

const inputClass =
  "mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

const secondaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const primaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60";

export function FormsClient({
  organizationId,
  orgSlug,
  orgName,
  forms,
  canCreateCustom = true,
}: {
  organizationId: string;
  orgSlug: string;
  orgName: string;
  forms: FormRow[];
  /** When false (Free plan), hide create controls; banner explains upgrade. */
  canCreateCustom?: boolean;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFields, setEditFields] = useState<FormField[]>(DEFAULT_FORM_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function publicUrl(slug: string) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/forms/${orgSlug}/${slug}`;
    }
    return `/forms/${orgSlug}/${slug}`;
  }

  async function copyLink(form: FormRow) {
    const url = publicUrl(form.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(form.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreateCustom) {
      setError("Custom forms need Starter or higher. Open Billing to upgrade.");
      return;
    }
    setError(null);
    const name = newName.trim();
    if (!name) {
      setError("Form name is required");
      return;
    }
    startTransition(async () => {
      const result = await createIntakeForm({ organizationId, name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewName("");
      window.location.href = "/dashboard/forms";
    });
  }

  function startEdit(form: FormRow) {
    setEditingId(form.id);
    setEditName(form.name);
    setEditSuccess(form.success_message ?? "");
    setEditHeadline(form.headline ?? "");
    setEditDescription(form.description ?? "");
    setEditFields(
      form.fields && form.fields.length > 0
        ? form.fields
        : DEFAULT_FORM_FIELDS,
    );
    setError(null);
  }

  function handleSaveEdit(formId: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateIntakeForm({
        organizationId,
        formId,
        name: editName,
        successMessage: editSuccess,
        headline: editHeadline,
        description: editDescription,
        fields: editFields,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      window.location.href = "/dashboard/forms";
    });
  }

  function togglePublish(form: FormRow) {
    setError(null);
    startTransition(async () => {
      const result = await updateIntakeForm({
        organizationId,
        formId: form.id,
        isPublished: !form.is_published,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = "/dashboard/forms";
    });
  }

  function exportForm(form: FormRow) {
    setError(null);
    startTransition(async () => {
      const result = await exportFormSubmissionsCsv({
        organizationId,
        formId: form.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function duplicateForm(form: FormRow) {
    if (!canCreateCustom) {
      setError("Custom forms need Starter or higher. Open Billing to upgrade.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await duplicateIntakeForm({
        organizationId,
        formId: form.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = "/dashboard/forms";
    });
  }

  function updateField(index: number, patch: Partial<FormField>) {
    setEditFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  }

  function addCustomField() {
    const id = `custom_${Math.random().toString(36).slice(2, 8)}`;
    setEditFields((prev) => [
      ...prev,
      {
        id,
        label: "New question",
        type: "text",
        required: false,
        enabled: true,
      },
    ]);
  }

  function removeField(index: number) {
    setEditFields((prev) => prev.filter((_, i) => i !== index));
  }

  function renderEditPanel(form: FormRow) {
    if (editingId !== form.id) return null;
    return (
      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">
            Headline (shown on public form)
          </label>
          <input
            value={editHeadline}
            onChange={(e) => setEditHeadline(e.target.value)}
            placeholder={`e.g. Contact ${orgName}`}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">
            Description
          </label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={2}
            placeholder="Short intro for visitors"
            className={`${inputClass} min-h-0`}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">
            Success message
          </label>
          <textarea
            value={editSuccess}
            onChange={(e) => setEditSuccess(e.target.value)}
            rows={2}
            className={`${inputClass} min-h-0`}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-slate-700">
              Questions / fields
            </label>
            <button
              type="button"
              onClick={addCustomField}
              className="text-xs font-medium text-sky-700 underline underline-offset-2"
            >
              + Add question
            </button>
          </div>
          <div className="space-y-2">
            {editFields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-12 sm:items-center"
              >
                <input
                  value={field.label}
                  onChange={(e) =>
                    updateField(index, {
                      label: e.target.value,
                    })
                  }
                  className="min-h-[40px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm sm:col-span-4"
                  placeholder="Label"
                />
                <select
                  value={field.type}
                  onChange={(e) =>
                    updateField(index, {
                      type: e.target.value as FormField["type"],
                    })
                  }
                  className="min-h-[40px] rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm sm:col-span-2"
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="textarea">Long text</option>
                </select>
                <label className="flex min-h-[40px] items-center gap-1.5 text-xs text-slate-600 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateField(index, {
                        required: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300"
                  />
                  Required
                </label>
                <label className="flex min-h-[40px] items-center gap-1.5 text-xs text-slate-600 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={(e) =>
                      updateField(index, {
                        enabled: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300"
                  />
                  Show
                </label>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="min-h-[40px] text-left text-xs font-medium text-red-600 sm:col-span-2 sm:text-center"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSaveEdit(form.id)}
            className={primaryBtn}
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className={secondaryBtn}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  function formMeta(form: FormRow) {
    return (
      <>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
            form.is_published
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-slate-50 text-slate-600 ring-slate-200"
          }`}
        >
          {form.is_published ? "Published" : "Draft"}
        </span>
        <span className="text-xs text-slate-400">
          /forms/{orgSlug}/{form.slug}
        </span>
      </>
    );
  }

  function formActions(form: FormRow) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyLink(form)}
          className={secondaryBtn}
        >
          <Link2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {copiedId === form.id ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => exportForm(form)}
          className={secondaryBtn}
        >
          Export CSV
        </button>
        <button
          type="button"
          disabled={isPending || !canCreateCustom}
          onClick={() => duplicateForm(form)}
          className={secondaryBtn}
          title={
            !canCreateCustom
              ? "Upgrade to create more custom forms"
              : undefined
          }
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() =>
            editingId === form.id ? setEditingId(null) : startEdit(form)
          }
          className={secondaryBtn}
        >
          {editingId === form.id ? "Close" : "Customize"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => togglePublish(form)}
          className={secondaryBtn}
        >
          {form.is_published ? "Unpublish" : "Publish"}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="border-b border-slate-200/80 pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          Forms
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Intake forms
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
          Public forms for{" "}
          <span className="font-medium text-slate-700">{orgName}</span>.
          Customize questions, share the link, and turn submissions into
          contacts on your journey board.
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}{" "}
          {!canCreateCustom && error.toLowerCase().includes("billing") ? (
            <Link
              href="/dashboard/billing"
              className="font-medium text-sky-700 underline underline-offset-2"
            >
              Open Billing
            </Link>
          ) : null}
        </p>
      ) : null}

      {canCreateCustom ? (
        <form
          id="new-form"
          onSubmit={handleCreate}
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:p-5"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="new-form-name"
              className="text-sm font-medium text-slate-700"
            >
              New form name
            </label>
            <input
              id="new-form-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Website inquiry"
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={isPending} className={primaryBtn}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {isPending ? "Creating…" : "Create form"}
          </button>
        </form>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm text-slate-600 sm:px-5">
          <p className="font-medium text-slate-800">
            Creating custom forms is locked on Free
          </p>
          <p className="mt-1 text-slate-500">
            Existing forms (if any) stay usable. Upgrade to Starter or higher to
            publish new intake forms. Pro trial includes this while active.
          </p>
          <Link
            href="/dashboard/billing"
            className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
          >
            View plans →
          </Link>
        </div>
      )}

      {forms.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={FileInput}
            title="No forms yet"
            description={
              canCreateCustom
                ? "Create an intake form, customize the questions, then share the public link. Submissions can become contacts on your journey board."
                : "Upgrade to Starter or higher to publish custom intake forms. Free still includes contacts, bookings, and email rules."
            }
            actionLabel={canCreateCustom ? "Create a form" : "Open Billing"}
            href={canCreateCustom ? undefined : "/dashboard/billing"}
            onAction={
              canCreateCustom
                ? () => {
                    document
                      .getElementById("new-form")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    document.getElementById("new-form-name")?.focus();
                  }
                : undefined
            }
            secondaryLabel={canCreateCustom ? undefined : "How plans work"}
            secondaryHref={canCreateCustom ? undefined : "/dashboard/billing"}
          />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {forms.map((form) => (
              <article
                key={form.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{form.name}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {formMeta(form)}
                    </div>
                  </div>
                  <p className="shrink-0 text-right text-xs text-slate-500">
                    <span className="block text-base font-semibold text-slate-900">
                      {form.submission_count}
                    </span>
                    submissions
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Created{" "}
                  {new Date(form.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <div className="mt-3">{formActions(form)}</div>
                {renderEditPanel(form)}
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Form name</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr
                    key={form.id}
                    className="border-b border-slate-50 align-top last:border-0"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{form.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {formMeta(form)}
                      </div>
                      {renderEditPanel(form)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(form.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {form.submission_count}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">{formActions(form)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
