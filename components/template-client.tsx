"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveEmailTemplate } from "@/app/dashboard/templates/actions";

export function TemplateClient({
  orgId,
  initialSubject,
  initialBody,
}: {
  orgId: string;
  initialSubject: string;
  initialBody: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await saveEmailTemplate(orgId, subject, body);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  const previewSubject = subject.replace(/{{first_name}}/g, "Sam");
  const previewBody = body
    .replace(/{{first_name}}/g, "Sam")
    .replace(/{{business_name}}/g, "Your Business");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
          Auto-Acknowledgment
        </span>
        <Link
          href="/dashboard/automation"
          className="text-xs text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD]"
        >
          ← Back to Automation
        </Link>
      </div>

      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Reply template
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-[#94A3B8]">
        This is the exact message sent automatically when a new email comes in.
        Use{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-[#E2E8F0]">
          {"{{first_name}}"}
        </code>{" "}
        and{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-[#E2E8F0]">
          {"{{business_name}}"}
        </code>{" "}
        to personalize it.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editor */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="subject" className="text-sm font-medium text-[#E2E8F0]">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="body" className="text-sm font-medium text-[#E2E8F0]">
              Message
            </label>
            <textarea
              id="body"
              required
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {saved && (
            <p className="text-sm text-[#67E8F9]">Template saved.</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all hover:bg-[#1D4ED8] hover:shadow-[#2563EB]/40 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save template"}
          </button>
        </form>

        {/* Preview */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#64748B]">
            Preview
          </span>
          <div className="mt-4 rounded-lg border border-white/10 bg-[#0B132B]/50 p-4">
            <p className="text-xs text-[#64748B]">Subject</p>
            <p className="mb-4 text-sm font-medium text-white">
              {previewSubject}
            </p>
            <p className="text-xs text-[#64748B]">Body</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#E2E8F0]">
              {previewBody}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}