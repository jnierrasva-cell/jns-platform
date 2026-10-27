"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

const SUPPORT_EMAIL = "support@jnsystem.app";

export function SupportBubble({
  userEmail,
  orgName,
}: {
  userEmail?: string | null;
  orgName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [subject, setSubject] = useState("JNS feedback / something to check");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setHintVisible(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  function openMail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = [
      message.trim(),
      "",
      "—",
      `Account email: ${userEmail?.trim() || "(not signed in)"}`,
      `Workspace: ${orgName?.trim() || "—"}`,
      `Page: ${window.location.href}`,
    ].join("\n");
    const params = new URLSearchParams({
      subject: subject.trim(),
      body,
    });
    window.location.href = `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="pointer-events-auto w-[min(100vw-2.5rem,24rem)] rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg shadow-zinc-900/10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                We’re here if you need us
              </p>
              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Spotted a bug, stuck on a step, or have an idea? Send us a
                message and we’ll take a look.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={openMail} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <label
                  htmlFor="support-account-email"
                  className="mb-1 block text-[11px] font-medium text-zinc-600"
                >
                  Your email
                </label>
                <input
                  id="support-account-email"
                  type="email"
                  readOnly
                  value={userEmail?.trim() || ""}
                  placeholder="Not signed in"
                  className="w-full min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600"
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="support-workspace"
                  className="mb-1 block text-[11px] font-medium text-zinc-600"
                >
                  Workspace
                </label>
                <input
                  id="support-workspace"
                  type="text"
                  readOnly
                  value={orgName?.trim() || ""}
                  placeholder="Not available"
                  className="w-full min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="support-subject"
                className="mb-1 block text-[11px] font-medium text-zinc-600"
              >
                Subject
              </label>
              <input
                id="support-subject"
                type="text"
                required
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#0B132B]"
              />
            </div>
            <div>
              <label
                htmlFor="support-message"
                className="mb-1 block text-[11px] font-medium text-zinc-600"
              >
                Message
              </label>
              <textarea
                id="support-message"
                required
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us what happened or how we can help."
                className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-[#0B132B]"
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-lg bg-[#0B132B] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a]"
            >
              Open email app
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            Your message will open in your email app addressed to{" "}
            {SUPPORT_EMAIL}.
          </p>
        </div>
      )}

      {!open && hintVisible && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto max-w-[14rem] rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-xs leading-5 text-zinc-700 shadow-md shadow-zinc-900/10 transition hover:border-zinc-300"
        >
          Find something for us to check on?
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0B132B] text-white shadow-lg shadow-zinc-900/20 transition hover:bg-[#111e3a]"
        aria-label={open ? "Close support" : "Open support"}
        aria-expanded={open}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}