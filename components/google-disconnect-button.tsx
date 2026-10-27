"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectGoogle } from "@/app/dashboard/integrations/actions";

export function GoogleDisconnectButton({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onDisconnect() {
    setError(null);
    startTransition(async () => {
      const result = await disconnectGoogle(organizationId);
      if (result && result.ok === false) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={onDisconnect}
        className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
      >
        {isPending ? "Disconnecting…" : "Disconnect Google"}
      </button>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
