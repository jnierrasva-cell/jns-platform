"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createIntakeForm,
  updateIntakeForm,
  exportFormSubmissionsCsv,
} from "@/app/dashboard/forms/actions";

type FormRow = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
  success_message: string;
  created_at: string;
};

type Submission = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
  form_id: string;
  contact_id: string | null;
  intake_forms?: { name: string } | { name: string }[] | null;
};

function formName(s: Submission) {
  const f = s.intake_forms;
  if (!f) return "Form";
  return Array.isArray(f) ? (f[0]?.name ?? "Form") : f.name;
}

export function FormsClient({
  organizationId,
  orgSlug,
  forms,
  submissions,
}: {
  organizationId: string;
  orgSlug: string;
  forms: FormRow[];
  submissions: Submission[];
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(null);

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

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        Lead capture
      </span>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        Intake forms
      </h1>
      <p className="mt-1 max-w-xl text-sm text-zinc-500">
        Create a form, copy the public link, and review submissions. Export any
        form’s responses as CSV.
      </p>
      <p className="mt-3 max-w-xl rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        <span className="font-medium">FYI:</span> The list below shows the{" "}
        <span className="font-medium">latest 50</span> submissions for speed.{" "}
        <span className="font-medium">Export CSV</span> downloads{" "}
        <span className="font-medium">all responses for that form</span> from
        the database.
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-8 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="text-sm font-medium text-zinc-700">
            New form name
          </label>
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Website contact"
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#0B132B] focus:ring-1 focus:ring-[#0B132B]"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#0B132B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create form"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-zinc-900">Your forms</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {forms.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              No forms yet. Create one above.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {forms.map((form) => {
                const count = submissions.filter(
                  (s) => s.form_id === form.id,
                ).length;
                return (
                  <li key={form.id} className="px-4 py-4">
                    {editingId === form.id ? (
                      <div className="flex flex-col gap-3">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
                        />
                        <textarea
                          value={editSuccess}
                          onChange={(e) => setEditSuccess(e.target.value)}
                          rows={2}
                          placeholder="Success message after submit"
                          className="rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleSaveEdit(form.id)}
                            className="rounded-lg bg-[#0B132B] px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-zinc-900">
                            {form.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            /forms/{orgSlug}/{form.slug} ·{" "}
                            {form.is_published ? "Published" : "Unpublished"} ·{" "}
                            {count} in recent list
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={publicUrl(form.slug)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => copyLink(form)}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            {copiedId === form.id ? "Copied" : "Copy link"}
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => exportForm(form)}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            Export CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(form)}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => togglePublish(form)}
                            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                          >
                            {form.is_published ? "Unpublish" : "Publish"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-zinc-900">
          Recent submissions
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Latest 50 for this workspace. Use Export CSV on a form for the full
          history of that form.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {submissions.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">
              No submissions yet. Share a form link to start capturing leads.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {submissions.map((s) => {
                const open = openSubmissionId === s.id;
                return (
                  <li key={s.id} className="px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900">
                          {s.name ?? "—"}
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            {formName(s)}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(s.created_at).toLocaleString()}
                          {s.email ? ` · ${s.email}` : ""}
                          {s.phone ? ` · ${s.phone}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenSubmissionId(open ? null : s.id)
                          }
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          {open ? "Hide" : "View"}
                        </button>
                        {s.contact_id && (
                          <Link
                            href={`/dashboard/contacts/${s.contact_id}`}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Contact
                          </Link>
                        )}
                      </div>
                    </div>
                    {open && (
                      <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-800">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Message
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-6">
                          {s.message?.trim()
                            ? s.message
                            : "No message was included with this submission."}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
