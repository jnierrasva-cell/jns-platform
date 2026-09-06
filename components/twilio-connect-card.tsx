"use client";

import { useState, useTransition } from "react";
import {
  disconnectTwilio,
  saveTwilioConnection,
} from "@/app/dashboard/integrations/twilio-actions";

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      try {
        await disconnectTwilio(organizationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not disconnect");
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-poppins)] text-base font-semibold text-white">
            Twilio (SMS)
          </h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Connect your own Twilio account to send appointment reminders.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
            connected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 bg-white/[0.04] text-[#94A3B8]"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {connected ? (
        <div className="mt-5">
          <p className="text-sm text-[#E2E8F0]">
            From number:{" "}
            <span className="font-medium text-white">{fromNumber}</span>
          </p>
          {canManage && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleDisconnect}
              className="mt-4 rounded-lg border border-white/15 px-3 py-2 text-xs text-[#94A3B8] transition hover:border-white/25 hover:text-white disabled:opacity-60"
            >
              {isPending ? "Working…" : "Disconnect Twilio"}
            </button>
          )}
        </div>
      ) : canManage ? (
        <form onSubmit={handleConnect} className="mt-5 flex flex-col gap-3">
          <input
            required
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
            placeholder="Account SID (ACxxxx)"
            className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
          />
          <input
            required
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Auth Token"
            className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
          />
          <input
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From number (+1...)"
            className="rounded-lg border border-white/15 bg-[#0B132B]/60 px-3.5 py-2.5 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Connect Twilio"}
          </button>
        </form>
      ) : (
        <p className="mt-5 text-sm text-[#94A3B8]">
          Ask the workspace owner to connect Twilio.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}