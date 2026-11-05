"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { HelpCircle } from "lucide-react";
import {
  disconnectTwilio,
  saveTwilioConnection,
} from "@/app/dashboard/integrations/twilio-actions";
import { sendTestSms } from "@/app/dashboard/integrations/sms-actions";

function TwilioSetupGuide() {
  return (
    <ol className="list-decimal space-y-2 pl-4 text-sm leading-6 text-slate-600">
      <li>
        Create or open a Twilio account at{" "}
        <a
          href="https://www.twilio.com/try-twilio"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-700 underline underline-offset-2"
        >
          twilio.com/try-twilio
        </a>
        .
      </li>
      <li>
        In the Twilio Console, open{" "}
        <a
          href="https://console.twilio.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-700 underline underline-offset-2"
        >
          Account → API keys & tokens
        </a>{" "}
        (or the dashboard home) and copy <strong>Account SID</strong> and{" "}
        <strong>Auth Token</strong>.
      </li>
      <li>
        Buy or pick a phone number under Phone Numbers → Manage → Active numbers.
        Copy it in E.164 form (example: +14155551234).
      </li>
      <li>
        Paste SID, token, and number in the form, then Connect. Send a test SMS to
        yourself to confirm.
      </li>
      <li className="text-slate-500">
        US numbers may need A2P 10DLC registration in Twilio before reliable
        delivery to US mobiles — complete that in the Twilio console if texts
        fail.
      </li>
    </ol>
  );
}

export function TwilioConnectCard({
  organizationId,
  connected,
  fromNumber,
  canManage,
}: {
  organizationId: string;
  connected: boolean;
  fromNumber: string | null;
  canManage: boolean;
}) {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [from, setFrom] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guidePinned, setGuidePinned] = useState(false);
  const [isPending, startTransition] = useTransition();
  const helpRef = useRef<HTMLDivElement>(null);
  const guideId = useId();

  const showGuide = guideOpen || guidePinned;

  useEffect(() => {
    if (!showGuide) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const el = helpRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setGuideOpen(false);
        setGuidePinned(false);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setGuideOpen(false);
        setGuidePinned(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showGuide]);

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await saveTwilioConnection({
          organizationId,
          accountSid,
          authToken,
          fromNumber: from,
        });
        setAccountSid("");
        setAuthToken("");
        setFrom("");
        setSuccess("Twilio connected.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleDisconnect() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await disconnectTwilio(organizationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not disconnect");
      }
    });
  }

  function handleTestSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await sendTestSms(organizationId, testPhone);
        setSuccess(`SMS sent (${result.sid})`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Test send failed");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Twilio (SMS)
            </h2>

            <div ref={helpRef} className="relative inline-flex">
              <button
                type="button"
                aria-label="How to set up Twilio"
                aria-expanded={showGuide}
                aria-controls={guideId}
                title="How to set up Twilio"
                onMouseEnter={() => setGuideOpen(true)}
                onMouseLeave={() => {
                  if (!guidePinned) setGuideOpen(false);
                }}
                onFocus={() => setGuideOpen(true)}
                onBlur={(e) => {
                  if (
                    !guidePinned &&
                    !helpRef.current?.contains(e.relatedTarget as Node | null)
                  ) {
                    setGuideOpen(false);
                  }
                }}
                onClick={() => {
                  setGuidePinned((p) => !p);
                  setGuideOpen(true);
                }}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition ${
                  showGuide
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden />
              </button>

              {showGuide && (
                <div
                  id={guideId}
                  role="dialog"
                  aria-label="Twilio setup guide"
                  onMouseEnter={() => setGuideOpen(true)}
                  onMouseLeave={() => {
                    if (!guidePinned) setGuideOpen(false);
                  }}
                  className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-lg ring-1 ring-black/5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Setup guide · about 2–3 minutes
                  </p>
                  <div className="mt-2">
                    <TwilioSetupGuide />
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400">
                    Hover to peek · click the ? to keep open · Esc to close
                  </p>
                </div>
              )}
            </div>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Optional
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Only needed for SMS reminders and texting contacts. Inbox, bookings,
            and email auto-reply work without Twilio. You use your own Twilio
            account — JNS does not bill SMS usage.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
            connected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200/80 bg-slate-50 text-slate-500"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {connected ? (
        <div className="mt-5 space-y-5">
          <p className="text-sm text-slate-700">
            From number:{" "}
            <span className="font-medium text-slate-900">{fromNumber}</span>
          </p>

          {canManage && (
            <>
              <form onSubmit={handleTestSend} className="flex flex-col gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Send test SMS
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+1 your mobile"
                    className="flex-1 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-600 transition hover:bg-sky-100 disabled:opacity-60"
                  >
                    {isPending ? "Sending…" : "Send test"}
                  </button>
                </div>
              </form>

              <button
                type="button"
                disabled={isPending}
                onClick={handleDisconnect}
                className="rounded-2xl border border-slate-200/80 px-3 py-2 text-xs text-slate-500 transition hover:border-zinc-300 hover:text-slate-900 disabled:opacity-60"
              >
                Disconnect Twilio
              </button>
            </>
          )}
        </div>
      ) : canManage ? (
        <form onSubmit={handleConnect} className="mt-5 flex flex-col gap-3">
          <input
            required
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
            placeholder="Account SID (ACxxxx)"
            autoComplete="off"
            className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <input
            required
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Auth Token"
            autoComplete="off"
            className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <input
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From number (+1...)"
            className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Connect Twilio"}
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          Ask the workspace owner to connect Twilio if you need SMS.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
    </div>
  );
}
