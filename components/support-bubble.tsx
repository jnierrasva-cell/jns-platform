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

  useEffect(() => {
    const t = window.setTimeout(() => setHintVisible(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  function buildMailto() {
    const account = userEmail?.trim() || "(not signed in)";
    const workspace = orgName?.trim() || "—";
    const subject = encodeURIComponent("JNS feedback / something to check");
    const body = encodeURIComponent(
      [
        "Hi JNS team,",
        "",
        "I noticed something I'd like you to look at:",
        "",
        "",
        "—",
        `Account email: ${account}`,
        `Workspace: ${workspace}`,
        `Page: ${typeof window !== "undefined" ? window.location.href : ""}`,
        "",
        "Thanks,",
      ].join("\n"),
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  function openMail(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = buildMailto();
    // Open mail first; close panel after so the control isn't unmounted mid-click
    window.location.href = url;
    window.setTimeout(() => setOpen(false), 300);
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="pointer-events-auto w-[min(100vw-2.5rem,20rem)] rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg shadow-zinc-900/10">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                We’re here if you need us
              </p>
              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                Spotted a bug, stuck on a step, or have an idea? Send a note and
                we’ll take a look. Your account email is included so we can find
                you quickly.
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
          <a
            href={buildMailto()}
            onClick={openMail}
            className="mt-4 flex w-full items-center justify-center rounded-lg bg-[#0B132B] px-3 py-2.5 text-sm font-medium text-white hover:bg-[#111e3a]"
          >
            Write to support
          </a>
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            Opens your email app → {SUPPORT_EMAIL}
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