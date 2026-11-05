"use client";

import { useState, useTransition } from "react";
import {
  disconnectTwilio,
  saveTwilioConnection,
} from "@/app/dashboard/integrations/twilio-actions";
import { sendTestSms } from "@/app/dashboard/integrations/sms-actions";

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
  const [showSetup, setShowSetup] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Twilio (SMS)
            </h2>
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
        <div className="mt-5 space-y-4">
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            {showSetup ? "Hide setup guide" : "How to connect (2–3 minutes)"}
          </button>

          {showSetup && (
            <ol className="list-decimal space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 pl-8 text-sm leading-6 text-slate-600">
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
                Buy or pick a phone number under Phone Numbers → Manage → Active
                numbers. Copy it in E.164 form (example: +14155551234).
              </li>
              <li>
                Paste SID, token, and number below, then Connect. Send a test SMS
                to yourself to confirm.
              </li>
              <li className="text-slate-500">
                US numbers may require A2P 10DLC registration with Twilio before
                reliable delivery to US mobiles — complete that in the Twilio
                console if texts fail.
              </li>
            </ol>
          )}

          <form onSubmit={handleConnect} className="flex flex-col gap-3">
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
        </div>
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
