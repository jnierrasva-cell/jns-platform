"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { disconnectGoogle } from "@/app/dashboard/integrations/actions";

type GoogleConnection = {
  connected_email: string | null;
  created_at: string;
} | null;

export function IntegrationsClient({
  orgId,
  isOrgCeo,
  googleConnection,
  statusParam,
}: {
  orgId: string;
  isOrgCeo: boolean;
  googleConnection: GoogleConnection;
  statusParam: string | null;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGoogle(orgId);
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#06B6D4]">
        Integrations
      </span>
      <h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-semibold text-white">
        Connected tools
      </h1>
      <p className="mt-1 text-sm text-[#94A3B8]">
        Link the accounts your automations run on.
      </p>

      {statusParam && !dismissed && (
        <div
          className={`mt-6 flex items-center justify-between rounded-xl border p-4 text-sm ${
            statusParam === "connected"
              ? "border-[#2563EB]/30 bg-[#2563EB]/10 text-[#93C5FD]"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          <span>
            {statusParam === "connected"
              ? "Google connected successfully."
              : `Google connection failed (${statusParam}). Try again.`}
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Google</p>
            <p className="mt-0.5 text-sm text-[#94A3B8]">
              {googleConnection
                ? `Connected as ${googleConnection.connected_email}`
                : "Not connected yet"}
            </p>
          </div>
          {isOrgCeo &&
            (googleConnection ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#94A3B8] transition hover:border-white/25 hover:text-white disabled:opacity-60"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <a
                href="/api/google/connect"
                className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8]"
              >
                Connect Google
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}