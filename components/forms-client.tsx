"use client";

import Link from "next/link";
import { FileInput, Link2, MoreHorizontal, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useEffect, useState, useTransition } from "react";
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
import {
  FormEditorDrawer,
  type FormDraft,
} from "@/components/form-editor-drawer";

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

const secondaryBtn =
  "inline-flex min-h-[36px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

const primaryBtn =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60";

export function FormsClient({
  organizationId,
  orgSlug,
  orgName,
  forms: initialForms,
  canCreateCustom = true,
}: {
  organizationId: string;
  orgSlug: string;
  orgName: string;
  forms: FormRow[];
  canCreateCustom?: boolean;
}) {
  const [forms, setForms] = useState(initialForms);
  useEffect(() => {
    setForms(initialForms);
  }, [initialForms]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
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

  function openEditor(form: FormRow) {
    setDraft({
      formId: form.id,
      name: form.name,
      headline: form.headline ?? "",
      description: form.description ?? "",
      successMessage: form.success_message ?? "",
      fields:
        form.fields && form.fields.length > 0
          ? form.fields.map((f) => ({ ...f }))
          : DEFAULT_FORM_FIELDS.map((f) => ({ ...f })),
      slug: form.slug,
      isPublished: form.is_published,
    });
    setError(null);
    setMenuOpenId(null);
  }

  function handleCreateFast() {
    if (!canCreateCustom) {
      setError("Custom forms need Starter or higher. Open Billing to upgrade.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createIntakeForm({
        organizationId,
        name: "Untitled form",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const newForm: FormRow = {
        id: result.formId,
        name: "Untitled form",
        slug: result.slug,
        is_published: true,
        success_message:
          "Thanks — we received your submission and will be in touch.",
        created_at: new Date().toISOString(),
        headline: null,
        description: null,
        fields: DEFAULT_FORM_FIELDS,
        submission_count: 0,
      };
      setForms((prev) => [newForm, ...prev]);
      openEditor(newForm);
    });
  }

  function handleSaveDraft() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await updateIntakeForm({
        organizationId,
        formId: draft.formId,
        name: draft.name,
        successMessage: draft.successMessage,
        headline: draft.headline,
        description: draft.description,
        fields: draft.fields,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForms((prev) =>
        prev.map((f) =>
          f.id === draft.formId
            ? {
                ...f,
                name: draft.name.trim() || f.name,
                success_message: draft.successMessage,
                headline: draft.headline || null,
                description: draft.description || null,
                fields: draft.fields,
              }
            : f,
        ),
      );
      setDraft(null);
    });
  }

  function togglePublish(form: FormRow) {
    setError(null);
    const next = !form.is_published;
    setForms((prev) =>
      prev.map((f) => (f.id === form.id ? { ...f, is_published: next } : f)),
    );
    setMenuOpenId(null);
    startTransition(async () => {
      const result = await updateIntakeForm({
        organizationId,
        formId: form.id,
        isPublished: next,
      });
      if (!result.ok) {
        setForms((prev) =>
          prev.map((f) =>
            f.id === form.id ? { ...f, is_published: form.is_published } : f,
          ),
        );
        setError(result.error);
      }
    });
  }

  function exportForm(form: FormRow) {
    setError(null);
    setMenuOpenId(null);
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
    setMenuOpenId(null);
    startTransition(async () => {
      const result = await duplicateIntakeForm({
        organizationId,
        formId: form.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const copy: FormRow = {
        ...form,
        id: result.formId,
        name: `${form.name} (copy)`,
        is_published: false,
        submission_count: 0,
        created_at: new Date().toISOString(),
        slug: `${form.slug}-copy`,
      };
      setForms((prev) => [copy, ...prev]);
    });
  }

  function StatusBadge({ published }: { published: boolean }) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
          published
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : "bg-slate-50 text-slate-600 ring-slate-200"
        }`}
      >
        {published ? "Published" : "Draft"}
      </span>
    );
  }

  function RowActions({ form }: { form: FormRow }) {
    const menuOpen = menuOpenId === form.id;
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => copyLink(form)}
          className={secondaryBtn}
        >
          <Link2 className="mr-1 h-3.5 w-3.5" aria-hidden />
          {copiedId === form.id ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => openEditor(form)}
          className={secondaryBtn}
        >
          Customize
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="More actions"
            onClick={() => setMenuOpenId(menuOpen ? null : form.id)}
            className={secondaryBtn}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
                onClick={() => setMenuOpenId(null)}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => exportForm(form)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  disabled={isPending || !canCreateCustom}
                  onClick={() => duplicateForm(form)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => togglePublish(form)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {form.is_published ? "Unpublish" : "Publish"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            Forms
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Intake forms
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            Public forms for{" "}
            <span className="font-medium text-slate-700">{orgName}</span>.
            Share a link; submissions become contacts on your journey board.
          </p>
        </div>
        {canCreateCustom ? (
          <button
            type="button"
            disabled={isPending}
            onClick={handleCreateFast}
            className={primaryBtn}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            {isPending && !draft ? "Creating…" : "Create form"}
          </button>
        ) : null}
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

      {!canCreateCustom ? (
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm text-slate-600 sm:px-5">
          <p className="font-medium text-slate-800">
            Creating custom forms is locked on Free
          </p>
          <p className="mt-1 text-slate-500">
            Existing forms stay usable. Upgrade to Starter or higher to publish
            new intake forms. Pro trial includes this while active.
          </p>
          <Link
            href="/dashboard/billing"
            className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
          >
            View plans →
          </Link>
        </div>
      ) : null}

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
            onAction={canCreateCustom ? handleCreateFast : undefined}
            secondaryLabel={canCreateCustom ? undefined : "How plans work"}
            secondaryHref={canCreateCustom ? undefined : "/dashboard/billing"}
          />
        </div>
      ) : (
        <>
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
                      <StatusBadge published={form.is_published} />
                      <span className="text-xs text-slate-400">
                        /forms/{orgSlug}/{form.slug}
                      </span>
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
                <div className="mt-3">
                  <RowActions form={form} />
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Form name</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Submissions</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forms.map((form) => (
                  <tr key={form.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{form.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        /forms/{orgSlug}/{form.slug}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge published={form.is_published} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(form.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      {form.submission_count}
                    </td>
                    <td className="px-5 py-3.5">
                      <RowActions form={form} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {draft ? (
        <FormEditorDrawer
          draft={draft}
          setDraft={setDraft}
          orgName={orgName}
          isPending={isPending}
          onSave={handleSaveDraft}
          onClose={() => setDraft(null)}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
        />
      ) : null}
    </div>
  );
}
