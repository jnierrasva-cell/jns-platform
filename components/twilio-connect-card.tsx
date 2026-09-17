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
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Twilio (SMS)
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Connect your own Twilio account to send appointment reminders.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
            connected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-zinc-200 bg-zinc-50 text-zinc-500"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {connected ? (
        <div className="mt-5 space-y-5">
          <p className="text-sm text-zinc-700">
            From number:{" "}
            <span className="font-medium text-zinc-900">{fromNumber}</span>
          </p>

          {canManage && (
            <>
              <form onSubmit={handleTestSend} className="flex flex-col gap-3">
                <label className="text-sm font-medium text-zinc-700">
                  Send test SMS
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+1 your mobile"
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg border border-[#2563EB]/40 bg-zinc-900/15 px-4 py-2.5 text-sm font-medium text-blue-600 transition hover:bg-zinc-900/25 disabled:opacity-60"
                  >
                    {isPending ? "Sending…" : "Send test"}
                  </button>
                </div>
              </form>

              <button
                type="button"
                disabled={isPending}
                onClick={handleDisconnect}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-60"
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
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          <input
            required
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Auth Token"
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          <input
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From number (+1...)"
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Connect Twilio"}
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-zinc-500">
          Ask the workspace owner to connect Twilio.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
    </div>
  );
}