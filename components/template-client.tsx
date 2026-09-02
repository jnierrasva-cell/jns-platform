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
    <div className="min-h-full bg-[#F6F5F1]">
      <header className="border-b border-[#E1DFD6] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-[#1B1D1F]"
          >
            JNSystem
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-[#1F4D42] underline underline-offset-2"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
          Auto-Acknowledgment
        </span>
        <h1 className="text-2xl font-medium text-[#1B1D1F]">
          Reply template
        </h1>
        <p className="mt-1 text-sm text-[#6B7069]">
          This is the exact message sent automatically when a new email
          comes in. Use{" "}
          <code className="rounded bg-[#F1F0EB] px-1 py-0.5 text-xs">
            {"{{first_name}}"}
          </code>{" "}
          and{" "}
          <code className="rounded bg-[#F1F0EB] px-1 py-0.5 text-xs">
            {"{{business_name}}"}
          </code>{" "}
          to personalize it.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-lg border border-[#E1DFD6] bg-white p-6"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="subject" className="text-sm text-[#1B1D1F]">
                Subject
              </label>
              <input
                id="subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="body" className="text-sm text-[#1B1D1F]">
                Message
              </label>
              <textarea
                id="body"
                required
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="rounded-md border border-[#DEDCD3] bg-white px-3 py-2 text-sm text-[#1B1D1F] outline-none focus:border-[#1F4D42] focus:ring-1 focus:ring-[#1F4D42]"
              />
            </div>

            {error && <p className="text-sm text-[#B3432B]">{error}</p>}
            {saved && (
              <p className="text-sm text-[#1F4D42]">Template saved.</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 rounded-md bg-[#1F4D42] py-2.5 text-sm font-medium text-white hover:bg-[#163B33] disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save template"}
            </button>
          </form>

          <div className="rounded-lg border border-[#E1DFD6] bg-white p-6">
            <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
              Preview
            </span>
            <div className="mt-3 rounded-md border border-[#E1DFD6] bg-[#F6F5F1] p-4">
              <p className="text-xs text-[#8A8F87]">Subject</p>
              <p className="mb-3 text-sm font-medium text-[#1B1D1F]">
                {previewSubject}
              </p>
              <p className="text-xs text-[#8A8F87]">Body</p>
              <p className="whitespace-pre-wrap text-sm text-[#1B1D1F]">
                {previewBody}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}