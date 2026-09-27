"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Service } from "@/lib/mock-services";
import { ServiceCard } from "@/components/service-card";
import { setAutomationEnabled } from "@/app/dashboard/automation/actions";

export function AutomationClient({
  organizationId,
  services,
  initialEnabledKeys,
}: {
  organizationId: string;
  services: Service[];
  initialEnabledKeys: string[];
}) {
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(
    () => new Set(initialEnabledKeys),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleService(service: Service) {
    if (service.status === "coming_soon") return;

    const nextEnabled = !enabledKeys.has(service.id);
    setError(null);

    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (nextEnabled) next.add(service.id);
      else next.delete(service.id);
      return next;
    });

    startTransition(async () => {
      try {
        await setAutomationEnabled(organizationId, service.id, nextEnabled);
      } catch (err) {
        setEnabledKeys((prev) => {
          const next = new Set(prev);
          if (nextEnabled) next.delete(service.id);
          else next.add(service.id);
          return next;
        });
        setError(err instanceof Error ? err.message : "Could not update");
      }
    });
  }

  const categories = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const service of services) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }
    return Array.from(map.entries());
  }, [services]);

  const activeCount = [...enabledKeys].filter((id) =>
    services.some((s) => s.id === id && s.status !== "coming_soon"),
  ).length;
  const availableCount = services.filter((s) => s.status !== "coming_soon")
    .length;
  const autoAckOn = enabledKeys.has("email-auto-ack");

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        Automation
      </span>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        Your systems
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {activeCount} of {availableCount} systems on
        {isPending ? " · Saving…" : ""}. Coming soon items stay off until
        ready.
      </p>

      {/* Email path — the product story */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">
          How inbound email works
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            <strong className="text-zinc-800">Connect Google</strong> under{" "}
            <Link
              href="/dashboard/integrations"
              className="underline underline-offset-2"
            >
              Integrations
            </Link>{" "}
            so we can read new mail for this workspace.
          </li>
          <li>
            <strong className="text-zinc-800">Turn on Auto-Acknowledgment</strong>{" "}
            below when you want instant replies.
          </li>
          <li>
            <strong className="text-zinc-800">Edit the reply template</strong>{" "}
            and set{" "}
            <Link
              href="/dashboard/email-rules"
              className="underline underline-offset-2"
            >
              Email rules
            </Link>{" "}
            so only the right senders become contacts (newsletters stay out).
          </li>
          <li>
            Check{" "}
            <Link
              href="/dashboard/unmatched"
              className="underline underline-offset-2"
            >
              Unmatched
            </Link>{" "}
            for messages that didn&apos;t match a rule — attach or ignore.
          </li>
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/integrations"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Integrations
          </Link>
          <Link
            href="/dashboard/templates"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Reply template
          </Link>
          <Link
            href="/dashboard/email-rules"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Email rules
          </Link>
          <Link
            href="/dashboard/unmatched"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Unmatched inbox
          </Link>
        </div>

        <p className="mt-3 text-xs text-zinc-400">
          Auto-ack is currently{" "}
          <span className="font-medium text-zinc-600">
            {autoAckOn ? "on" : "off"}
          </span>{" "}
          for this workspace.
        </p>
      </section>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-10 flex flex-col gap-10">
        {categories.map(([category, categoryServices]) => (
          <section key={category}>
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
              {category}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryServices.map((service) => (
                <div key={service.id} className="flex flex-col gap-2">
                  <ServiceCard
                    service={service}
                    isOn={enabledKeys.has(service.id)}
                    onToggle={() => toggleService(service)}
                  />
                  {service.id === "email-auto-ack" && (
                    <div className="flex flex-wrap gap-3 px-0.5">
                      <Link
                        href="/dashboard/templates"
                        className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                      >
                        Edit reply template
                      </Link>
                      <Link
                        href="/dashboard/email-rules"
                        className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                      >
                        Email rules
                      </Link>
                      <Link
                        href="/dashboard/unmatched"
                        className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                      >
                        Unmatched
                      </Link>
                    </div>
                  )}
                  {service.id === "sms-reminders" && (
                    <Link
                      href="/dashboard/integrations"
                      className="px-0.5 text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                    >
                      Twilio settings / test SMS
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
