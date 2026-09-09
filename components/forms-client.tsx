"use client";

import { useState } from "react";
import Link from "next/link";

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
  return Array.isArray(f) ? f[0]?.name ?? "Form" : f.name;
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
      // fallback: select-friendly alert
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="pb-4">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Lead capture
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Intake forms
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          Share a form link on your website or socials. Submissions become
          contacts in your CRM.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-white">Your forms</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
          {forms.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">
              No forms yet. Create one in Supabase or we can add a creator next.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {forms.map((form) => (
                <li
                  key={form.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{form.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      /forms/{orgSlug}/{form.slug}
                      {" · "}
                      {form.is_published ? "Published" : "Unpublished"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={publicUrl(form.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/25 hover:text-white"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => copyLink(form)}
                      className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-100 transition hover:bg-blue-500/20"
                    >
                      {copiedId === form.id ? "Copied" : "Copy link"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-white">Recent submissions</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
          {submissions.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">
              No submissions yet. Share a form link to start capturing leads.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Form</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-white/5 last:border-0"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(s.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {s.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{s.email ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{formName(s)}</td>
                    <td className="px-4 py-3 text-right">
                      {s.contact_id ? (
                        <Link
                          href={`/dashboard/contacts/${s.contact_id}`}
                          className="text-xs text-cyan-200 underline underline-offset-2 hover:text-cyan-100"
                        >
                          Contact
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}