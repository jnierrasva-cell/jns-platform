"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import type { Service } from "@/lib/mock-services";
import {
  setAutomationEnabled,
  saveAutomationSettings,
} from "@/app/dashboard/automation/actions";
import PageHeader from "@/components/ui/PageHeader";
import {
  Mail,
  MessageCircle,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Settings2,
} from "lucide-react";

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

type AutomationMeta = {
  trigger: string;
  action: string;
  integration: string;
  icon: typeof Mail;
  configureHref?: string;
};

const META: Record<string, AutomationMeta> = {
  "email-auto-ack": {
    trigger: "Incoming email matches an enabled rule",
    action: "Send reply from connected Google using a template",
    integration: "Google + Email rules + Template",
    icon: Mail,
    configureHref: "/dashboard/email-rules",
  },
  "booking-email-reminders": {
    trigger: "Booking created or approaching start time",
    action: "Send confirmation / reminder email via JNS mail",
    integration: "JNS email (no Google required)",
    icon: CalendarDays,
  },
  "sms-reminders": {
    trigger: "Booking approaching (hours before)",
    action: "Text the contact from your Twilio number",
    integration: "Twilio",
    icon: MessageCircle,
    configureHref: "/dashboard/integrations",
  },
};

export function AutomationClient({
  organizationId,
  services,
  initialEnabledKeys,
  initialSettings,
  recentActivity = [],
  googleConnected = false,
  googleEmail = null,
  googleNeedsReauth = false,
  googleWatchStale = false,
  twilioConnected = false,
  twilioFrom = null,
  enabledRulesCount = 0,
}: {
  organizationId: string;
  services: Service[];
  initialEnabledKeys: string[];
  initialSettings: Record<string, Record<string, unknown>>;
  recentActivity?: ActivityRow[];
  googleConnected?: boolean;
  googleEmail?: string | null;
  googleNeedsReauth?: boolean;
  googleWatchStale?: boolean;
  twilioConnected?: boolean;
  twilioFrom?: string | null;
  enabledRulesCount?: number;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeCount = services.filter((s) => enabledKeys.has(s.id)).length;
  const sentOk = recentActivity.filter(
    (r) => r.status === "sent" || r.status === "received",
  ).length;
  const failed = recentActivity.filter((r) => r.status === "failed").length;

  function toggleService(service: Service) {
    const nextEnabled = !enabledKeys.has(service.id);
    setError(null);
    setSettingsSaved(null);

    setEnabledKeys((prev) => {
      const next = new Set(prev);
      if (nextEnabled) next.add(service.id);
      else next.delete(service.id);
      return next;
    });

    startTransition(async () => {
      try {
        await setAutomationEnabled(organizationId, service.id, nextEnabled);
        if (nextEnabled) setExpandedId(service.id);
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

  function saveSmsSettings(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSettingsSaved(null);
    const hours = Math.max(1, Math.min(168, Number(hoursBefore) || 24));
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

  function saveEmailSettings(e: FormEvent) {
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

  type ReadyItem = {
    id: string;
    label: string;
    detail: string;
    done: boolean;
    href: string;
    optional?: boolean;
  };

  const googleReady = googleConnected && !googleNeedsReauth;

  const readiness: ReadyItem[] = [
    {
      id: "google",
      label: "Google",
      detail: googleNeedsReauth
        ? `Reconnect required${googleEmail ? ` (${googleEmail})` : ""}`
        : googleConnected
          ? googleEmail || "Connected"
          : "Required for inquiry auto-reply",
      done: googleReady,
      href: "/dashboard/integrations",
    },
    {
      id: "rules",
      label: "Email rules",
      detail:
        enabledRulesCount > 0
          ? `${enabledRulesCount} enabled`
          : "At least one rule for auto-reply",
      done: enabledRulesCount > 0,
      href: "/dashboard/email-rules",
    },
    {
      id: "templates",
      label: "Templates",
      detail: "Reply copy for automations",
      done: true,
      href: "/dashboard/templates",
    },
    {
      id: "twilio",
      label: "Twilio",
      detail: twilioConnected
        ? twilioFrom || "Connected"
        : "Only if you use SMS reminders",
      done: twilioConnected,
      href: "/dashboard/integrations",
      optional: true,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="Systems"
        title="Automation Center"
        description="Turn on the workflows that run without you. Only live systems are listed."
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Automations", value: services.length },
          { label: "Active now", value: activeCount },
          { label: "Recent events", value: recentActivity.length },
          { label: "Failed (recent)", value: failed },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {m.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {m.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            <Settings2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Connection readiness
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Auto-reply needs Google + rules. SMS needs Twilio. Toggles fail
              clearly if something is missing.
            </p>
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {readiness.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                {p.done ? (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : p.optional ? (
                  <span
                    className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border-2 border-slate-300"
                    aria-hidden
                  />
                ) : (
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                    aria-hidden
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {p.label}
                    {p.optional && !p.done ? (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">
                        optional
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-slate-500">{p.detail}</p>
                </div>
              </div>
              <Link
                href={p.href}
                className="inline-flex min-h-[36px] shrink-0 items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                Open
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {googleNeedsReauth && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">Google needs to be reconnected</p>
          <p className="mt-1 text-amber-900/90">
            Auto-reply and Gmail watch cannot run until access is renewed.{" "}
            <Link
              href="/dashboard/integrations"
              className="font-semibold underline underline-offset-2"
            >
              Open Connections
            </Link>
          </p>
        </div>
      )}

      {!googleNeedsReauth && googleWatchStale && (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          role="status"
        >
          <p className="font-medium text-slate-900">
            Inbox watch may be stale
          </p>
          <p className="mt-1 text-slate-600">
            Inquiry auto-reply is on, but Gmail push watch looks expired. Toggle
            auto-reply off then on to restart the watch, or reconnect Google under{" "}
            <Link
              href="/dashboard/integrations"
              className="font-medium text-slate-900 underline underline-offset-2"
            >
              Connections
            </Link>
            .
          </p>
        </div>
      )}

      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {settingsSaved && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {settingsSaved}
        </p>
      )}
      {isPending && <p className="text-xs text-slate-500">Saving...</p>}

      <div className="space-y-8">
        {categories.map(([category, categoryServices]) => (
          <section key={category}>
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
              {category} automations
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {categoryServices.map((service) => {
                const isOn = enabledKeys.has(service.id);
                const meta = META[service.id];
                const Icon = meta?.icon ?? Mail;
                const expanded = expandedId === service.id;

                return (
                  <article
                    key={service.id}
                    className={`flex flex-col rounded-2xl border bg-white shadow-sm transition ${
                      isOn
                        ? "border-sky-200 ring-1 ring-sky-100"
                        : "border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 p-5">
                      <div className="flex min-w-0 gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${\n                            isOn
                              ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100"
                              : "bg-slate-50 text-slate-500 ring-1 ring-slate-100"
                          }`}
                        >
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-slate-900">
                              {service.name}
                            </h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${\n                                isOn
                                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                              }`}
                            >
                              {isOn ? "Active" : "Off"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-slate-500">
                            {service.description}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        aria-label={`Turn ${service.name} ${isOn ? "off" : "on"}`}
                        disabled={isPending}
                        onClick={() => toggleService(service)}
                        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${\n                          isOn
                            ? "border-sky-600 bg-sky-600"
                            : "border-slate-300 bg-slate-200"
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${\n                            isOn ? "left-[22px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    {meta && (
                      <div className="space-y-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-600">
                        <div className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1.5">
                          <span className="font-medium text-slate-400">Trigger</span>
                          <span>{meta.trigger}</span>
                          <span className="font-medium text-slate-400">Action</span>
                          <span>{meta.action}</span>
                          <span className="font-medium text-slate-400">Needs</span>
                          <span>{meta.integration}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 pt-1">
                          {meta.configureHref && (
                            <Link
                              href={meta.configureHref}
                              className="font-medium text-sky-700 underline-offset-2 hover:underline"
                            >
                              Configure
                            </Link>
                          )}
                          {service.id === "email-auto-ack" && (
                            <>
                              <Link href="/dashboard/templates" className="font-medium text-sky-700 underline-offset-2 hover:underline">Templates</Link>
                              <Link href="/dashboard/unmatched" className="font-medium text-sky-700 underline-offset-2 hover:underline">Needs review</Link>
                            </>
                          )}
                          {(service.id === "email-auto-ack" || service.id === "sms-reminders") && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : service.id)}
                              className="font-medium text-slate-600 underline-offset-2 hover:underline"
                            >
                              {expanded ? "Hide options" : "Options"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {expanded && service.id === "email-auto-ack" && isOn && (
                      <form onSubmit={saveEmailSettings} className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                        <label className="block text-xs font-medium text-slate-700">
                          Exclude domains (optional)
                          <input
                            value={excludeDomains}
                            onChange={(e) => setExcludeDomains(e.target.value)}
                            placeholder="mailchimp.com, noreply.example"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          />
                        </label>
                        <button type="submit" disabled={isPending} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                          Save email options
                        </button>
                      </form>
                    )}

                    {expanded && service.id === "sms-reminders" && isOn && (
                      <form onSubmit={saveSmsSettings} className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                        <label className="block text-xs font-medium text-slate-700">
                          Hours before start
                          <input type="number" min={1} max={168} value={hoursBefore} onChange={(e) => setHoursBefore(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                        </label>
                        <label className="block text-xs font-medium text-slate-700">
                          Message template
                          <textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                        </label>
                        <button type="submit" disabled={isPending} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                          Save SMS options
                        </button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Last {recentActivity.length} email events for this workspace
          {failed > 0 ? ` · ${failed} failed` : ""}
          {sentOk > 0 ? ` · ${sentOk} sent/received` : ""}.
        </p>
        {recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No activity yet. After Google + a rule + auto-reply, send a test
            message to the connected inbox.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recentActivity.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {row.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[row.direction, row.service_key, row.status]
                      .filter(Boolean)
                      .join(" · ")}
                    {row.to_email ? ` → ${row.to_email}` : ""}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-slate-400">
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
