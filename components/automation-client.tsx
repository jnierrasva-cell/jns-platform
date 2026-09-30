"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { Service } from "@/lib/mock-services";
import { ServiceCard } from "@/components/service-card";
import {
  setAutomationEnabled,
  saveAutomationSettings,
} from "@/app/dashboard/automation/actions";

const DEFAULT_SMS_MESSAGE =
  'Hi {{first_name}}, reminder: "{{title}}" is scheduled for {{when}}. Reply if you need to reschedule.';

type ActivityRow = {
  id: string;
  service_key: string | null;
  direction: string | null;
  status: string | null;
  subject: string | null;
  to_email: string | null;
  from_email: string | null;
  created_at: string;
};

export function AutomationClient({
  organizationId,
  services,
  initialEnabledKeys,
  initialSettings,
  recentActivity = [],
}: {
  organizationId: string;
  services: Service[];
  initialEnabledKeys: string[];
  initialSettings: Record<string, Record<string, unknown>>;
  recentActivity?: ActivityRow[];
}) {
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(
    () => new Set(initialEnabledKeys),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const smsSettings = initialSettings["sms-reminders"] ?? {};
  const emailSettings = initialSettings["email-auto-ack"] ?? {};

  const [hoursBefore, setHoursBefore] = useState(
    String(Number(smsSettings.hours_before) || 24),
  );
  const [smsMessage, setSmsMessage] = useState(
    String(smsSettings.message || DEFAULT_SMS_MESSAGE),
  );
  const [excludeDomains, setExcludeDomains] = useState(
    Array.isArray(emailSettings.exclude_domains)
      ? (emailSettings.exclude_domains as string[]).join(", ")
      : "",
  );
  const [settingsSaved, setSettingsSaved] = useState<string | null>(null);

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

  function saveSmsSettings(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSettingsSaved(null);
    const hours = Math.min(72, Math.max(1, Number(hoursBefore) || 24));
    startTransition(async () => {
      try {
        await saveAutomationSettings({
          organizationId,
          serviceKey: "sms-reminders",
          settings: {
            hours_before: hours,
            message: smsMessage.trim() || DEFAULT_SMS_MESSAGE,
          },
        });
        setHoursBefore(String(hours));
        setSettingsSaved("SMS reminder settings saved.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function saveEmailSettings(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSettingsSaved(null);
    const domains = excludeDomains
      .split(/[,\s]+/)
      .map((d) => d.toLowerCase().replace(/^@/, "").trim())
      .filter(Boolean);
    startTransition(async () => {
      try {
        await saveAutomationSettings({
          organizationId,
          serviceKey: "email-auto-ack",
          settings: { exclude_domains: domains },
        });
        setSettingsSaved("Email auto-reply settings saved.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
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

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        Automation
      </span>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
        Follow-up under your control
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">
        Turn on the jobs you need. Configure templates, rules, and messages —
        no flowchart required. {activeCount} of {availableCount} live systems on
        {isPending ? " · Saving…" : ""}.
      </p>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">
          How this stays simple
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
          <li>
            Connect Google (and Twilio for SMS) under{" "}
            <Link href="/dashboard/integrations" className="underline">
              Integrations
            </Link>
            .
          </li>
          <li>
            Write{" "}
            <Link href="/dashboard/templates" className="underline">
              templates
            </Link>
            , then set{" "}
            <Link href="/dashboard/email-rules" className="underline">
              email rules
            </Link>{" "}
            so only the right mail gets a reply or becomes a contact.
          </li>
          <li>
            Check{" "}
            <Link href="/dashboard/unmatched" className="underline">
              Unmatched
            </Link>{" "}
            for everything else — nothing silent, nothing spammy.
          </li>
        </ol>
      </section>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {settingsSaved && (
        <p className="mt-4 text-sm text-emerald-600">{settingsSaved}</p>
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
                        Templates
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
                      Twilio in Integrations
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-medium text-zinc-900">
          Inquiry auto-reply — settings
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Domains listed here never get an auto-reply (newsletters, no-reply,
          etc.).
        </p>
        <form onSubmit={saveEmailSettings} className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-zinc-700">
              Exclude domains (comma-separated)
            </label>
            <input
              value={excludeDomains}
              onChange={(e) => setExcludeDomains(e.target.value)}
              placeholder="noreply.com, mailchimp.com"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#0B132B] px-4 py-2 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
          >
            Save email settings
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-medium text-zinc-900">
          Booking SMS reminders — settings
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Use {"{{first_name}}"}, {"{{title}}"}, {"{{when}}"}. Reminders send
          once per booking.
        </p>
        <form onSubmit={saveSmsSettings} className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-zinc-700">
              Hours before appointment
            </label>
            <input
              type="number"
              min={1}
              max={72}
              value={hoursBefore}
              onChange={(e) => setHoursBefore(e.target.value)}
              className="mt-1 w-32 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-700">Message</label>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#0B132B] px-4 py-2 text-sm font-medium text-white hover:bg-[#111e3a] disabled:opacity-60"
          >
            Save SMS settings
          </button>
        </form>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-medium text-zinc-900">
          Recent email activity
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          What the workspace logged (auto-reply, form thank-you, outbound). Open
          a contact for the same trail on their record.
        </p>
        {recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No activity yet. After Google is connected and a rule or form fires,
            rows appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {recentActivity.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-0.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {row.subject || row.service_key || "Email event"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {row.direction ?? "—"} · {row.status ?? "—"}
                    {row.to_email ? ` · to ${row.to_email}` : ""}
                    {row.from_email ? ` · from ${row.from_email}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-zinc-400">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
