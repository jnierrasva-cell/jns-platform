"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mockServices } from "@/lib/mock-services";
import { ServiceCard } from "@/components/service-card";
import { createClient } from "@/lib/supabase/client";
import { disconnectGoogle } from "@/app/dashboard/integrations/actions";

type GoogleConnection = {
  connected_email: string | null;
  created_at: string;
} | null;

export function DashboardClient({
  userEmail,
  isAdmin,
  isOrgCeo,
  orgId,
  orgName,
  googleConnection,
  googleStatusParam,
}: {
  userEmail: string;
  isAdmin: boolean;
  isOrgCeo: boolean;
  orgId: string;
  orgName: string;
  googleConnection: GoogleConnection;
  googleStatusParam: string | null;
}) {
  const [activeIds, setActiveIds] = useState<Set<string>>(
    () =>
      new Set(
        mockServices.filter((s) => s.status === "active").map((s) => s.id),
      ),
  );
  const [disconnecting, setDisconnecting] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGoogle(orgId);
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  function toggleService(id: string) {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const categories = useMemo(() => {
    const map = new Map<string, typeof mockServices>();
    for (const service of mockServices) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }
    return Array.from(map.entries());
  }, []);

  const activeCount = activeIds.size;

  return (
    <div className="min-h-full bg-[#F6F5F1]">
      <header className="border-b border-[#E1DFD6] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-mono text-sm tracking-tight text-[#1B1D1F]"
          >
            JNSystem
          </Link>
          <div className="flex items-center gap-4">
            {isOrgCeo && (
              <>
                <Link
                  href="/dashboard/templates"
                  className="text-sm text-[#1F4D42] underline underline-offset-2"
                >
                  Reply template
                </Link>
                <Link
                  href="/dashboard/team"
                  className="text-sm text-[#1F4D42] underline underline-offset-2"
                >
                  Team
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-md border border-[#1F4D42] px-3 py-1 text-xs font-medium text-[#1F4D42] hover:bg-[#1F4D42] hover:text-white"
              >
                Admin panel
              </Link>
            )}
            <span className="text-sm text-[#6B7069]">{userEmail}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-[#1F4D42] underline underline-offset-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {googleStatusParam && !dismissedBanner && (
          <div
            className={`mb-6 flex items-center justify-between rounded-lg border p-4 text-sm ${
              googleStatusParam === "connected"
                ? "border-[#CFE0D9] bg-[#EAF1EE] text-[#1F4D42]"
                : "border-[#E9CFA0] bg-[#F6E9D3] text-[#8A5A16]"
            }`}
          >
            <span>
              {googleStatusParam === "connected"
                ? "Google connected successfully."
                : `Google connection failed (${googleStatusParam}). Try again.`}
            </span>
            <button
              onClick={() => setDismissedBanner(true)}
              className="text-xs underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-8 flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
            {orgName}
          </span>
          <h1 className="text-2xl font-medium text-[#1B1D1F]">
            Your systems
          </h1>
          <p className="mt-1 text-sm text-[#6B7069]">
            {activeCount} of {mockServices.length} systems switched on.
          </p>
        </div>

        <section className="mb-10 rounded-lg border border-[#E1DFD6] bg-white p-5">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
            Integrations
          </h2>
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
        </section>

        <div className="flex flex-col gap-10">
          {categories.map(([category, services]) => (
            <section key={category}>
              <h2 className="mb-4 font-mono text-xs uppercase tracking-wide text-[#8A8F87]">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isOn={activeIds.has(service.id)}
                    onToggle={() => toggleService(service.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}