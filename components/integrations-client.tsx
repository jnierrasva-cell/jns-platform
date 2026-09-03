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
      <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
        Integrations
      </span>
      <h1 className="text-2xl font-medium text-[#1B1D1F]">
        Connected tools
      </h1>
      <p className="mt-1 text-sm text-[#6B7069]">
        Link the accounts your automations run on.
      </p>

      {statusParam && !dismissed && (
        <div
          className={`mt-6 flex items-center justify-between rounded-lg border p-4 text-sm ${
            statusParam === "connected"
              ? "border-[#CFE0D9] bg-[#EAF1EE] text-[#1F4D42]"
              : "border-[#E9CFA0] bg-[#F6E9D3] text-[#8A5A16]"
          }`}
        >
          <span>
            {statusParam === "connected"
              ? "Google connected successfully."
              : `Google connection failed (${statusParam}). Try again.`}
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-[#E1DFD6] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#1B1D1F]">Google</p>
            <p className="text-sm text-[#6B7069]">
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
                className="rounded-md border border-[#DEDCD3] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7069] hover:border-[#B9C4BF] disabled:opacity-60"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <a
                href="/api/google/connect"
                className="rounded-md bg-[#1F4D42] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#163B33]"
              >
                Connect Google
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}