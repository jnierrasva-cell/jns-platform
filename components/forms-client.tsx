"use client";

import { FileInput } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

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

export function FormsClient({
  organizationId,
  orgSlug,
  orgName,
  forms,
}: {
  organizationId: string;
  orgSlug: string;
  orgName: string;
  forms: FormRow[];
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

  return (
    <div className="space-y-6 pb-6">
      <header className="border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase text-text-muted">
          Intake forms
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
          Intake forms
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
          Public forms for <span className="font-medium text-foreground">{orgName}</span>.
          Customize questions, then share the link. Submissions become clients.
        </p>
      </header>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <form
        id="new-form"
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-5"
      >
        <div className="min-w-[200px] flex-1">
          <label className="text-sm text-text-secondary">New form name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Website inquiry"
            className="mt-1 min-h-11 w-full rounded-xl border border-input bg-surface-inset px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-text-muted outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A] disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create form"}
        </button>
      </form>

      {forms.length === 0 ? (
        <div>
          <EmptyState
            icon={FileInput}
            title="No forms yet"
            description="Publish an intake form to collect leads. Submissions can create contacts and show up in Recent submissions."
            actionLabel="Scroll to create"
            onAction={() => {
              document
                .getElementById("new-form")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card text-card-foreground">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-surface-inset text-xs font-semibold uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Form name</th>
                <th className="px-4 py-3 font-medium">Date created</th>
                <th className="px-4 py-3 font-medium">Submissions</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr
                  key={form.id}
                  className="border-b border-border align-top last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{form.name}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {form.is_published ? "Published" : "Unpublished"} · /forms/
                      {orgSlug}/{form.slug}
                    </p>
                    {editingId === form.id && (
                      <div className="mt-4 space-y-4 rounded-2xl border border-border bg-surface-inset p-4">
                        <div>
                          <label className="text-sm text-text-secondary">Name</label>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-text-secondary">
                            Headline (shown on public form)
                          </label>
                          <input
                            value={editHeadline}
                            onChange={(e) => setEditHeadline(e.target.value)}
                            placeholder={`e.g. Contact ${orgName}`}
                            className="mt-1 min-h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-text-secondary">
                            Description
                          </label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            placeholder="Short intro for visitors"
                            className="mt-1 min-h-20 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-text-secondary">
                            Success message
                          </label>
                          <textarea
                            value={editSuccess}
                            onChange={(e) => setEditSuccess(e.target.value)}
                            rows={2}
                            className="mt-1 min-h-20 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-[15px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                          />
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-semibold text-foreground">
                              Questions / fields
                            </label>
                            <button
                              type="button"
                              onClick={addCustomField}
                              className="inline-flex min-h-11 items-center text-sm text-accent-cyan underline underline-offset-2"
                            >
                              + Add question
                            </button>
                          </div>
                          <div className="space-y-2">
                            {editFields.map((field, index) => (
                              <div
                                key={field.id}
                                className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-12"
                              >
                                <input
                                  value={field.label}
                                  onChange={(e) =>
                                    updateField(index, {
                                      label: e.target.value,
                                    })
                                  }
                                  className="min-h-11 rounded-lg border border-input bg-surface-inset px-3 text-sm text-foreground sm:col-span-4"
                                  placeholder="Label"
                                />
                                <select
                                  value={field.type}
                                  onChange={(e) =>
                                    updateField(index, {
                                      type: e.target.value as FormField["type"],
                                    })
                                  }
                                  className="min-h-11 rounded-lg border border-input bg-surface-inset px-3 text-sm text-foreground sm:col-span-2"
                                >
                                  <option value="text">Text</option>
                                  <option value="email">Email</option>
                                  <option value="phone">Phone</option>
                                  <option value="textarea">Long text</option>
                                </select>
                                <label className="flex min-h-11 items-center gap-2 text-sm text-text-secondary sm:col-span-2">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) =>
                                      updateField(index, {
                                        required: e.target.checked,
                                      })
                                    }
                                  />
                                  Required
                                </label>
                                <label className="flex min-h-11 items-center gap-2 text-sm text-text-secondary sm:col-span-2">
                                  <input
                                    type="checkbox"
                                    checked={field.enabled}
                                    onChange={(e) =>
                                      updateField(index, {
                                        enabled: e.target.checked,
                                      })
                                    }
                                  />
                                  Show
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeField(index)}
                                  className="min-h-11 text-sm text-danger underline underline-offset-2 sm:col-span-2"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleSaveEdit(form.id)}
                            className="min-h-11 rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A]"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="min-h-11 rounded-xl border border-border px-4 text-sm text-text-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(form.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <Badge variant="secondary">{form.submission_count}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => copyLink(form)}
                        className="min-h-11 rounded-xl border border-border px-3 text-sm text-text-secondary hover:bg-surface-inset"
                      >
                        {copiedId === form.id ? "Copied" : "Copy link"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => exportForm(form)}
                        className="min-h-11 rounded-xl border border-border px-3 text-sm text-text-secondary hover:bg-surface-inset"
                      >
                        Export CSV
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => duplicateForm(form)}
                        className="min-h-11 rounded-xl border border-border px-3 text-sm text-text-secondary hover:bg-surface-inset"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editingId === form.id
                            ? setEditingId(null)
                            : startEdit(form)
                        }
                        className="min-h-11 rounded-xl border border-border px-3 text-sm text-text-secondary hover:bg-surface-inset"
                      >
                        {editingId === form.id ? "Close" : "Customize"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => togglePublish(form)}
                        className="min-h-11 rounded-xl border border-border px-3 text-sm text-text-secondary hover:bg-surface-inset"
                      >
                        {form.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}