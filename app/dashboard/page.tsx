import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlanGateState } from "@/lib/billing/org-plan";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import {
  Plug,
  Users,
  Zap,
  CalendarDays,
  Contact,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { FirstRunPanel } from "@/components/first-run-panel";

type OverviewMetric = {
  href: string;
  label: string;
  value: number | string;
  detail: string;
  icon: typeof Zap;
};

type SetupStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  done: boolean;
  critical: boolean;
};

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;
  const gate = await getPlanGateState(orgId);
  const planLabel = PLAN_LIMITS[gate.planId].label;
  const planId = gate.planId;
  const periodEnd = gate.billing.plan_period_end;
  const periodLabel =
    periodEnd && !Number.isNaN(new Date(periodEnd).getTime())
      ? new Date(periodEnd).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;
  const isManager = active.role === "ceo" || active.role === "admin";
  const admin = createAdminClient();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    googleRes,
    twilioRes,
    arketaRes,
    teamRes,
    automationRes,
    contactsRes,
    stagesRes,
    bookingsRes,
    unmatchedRes,
    autoAckRes,
    rulesRes,
    templatesRes,
    activityRes,
  ] = await Promise.all([
    admin
      .from("connections")
      .select("connected_email")
      .eq("organization_id", orgId)
      .eq("provider", "google")
      .maybeSingle(),
    admin
      .from("twilio_connections")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle(),
    admin
      .from("arketa_locations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("org_automations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_enabled", true),
    admin
      .from("contacts")
      .select(
        "id, status, first_name, last_name, email, created_at, pipeline_stage_id",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    admin
      .from("pipeline_stages")
      .select("id, name, slug, position, is_won, is_lost")
      .eq("organization_id", orgId)
      .order("position", { ascending: true }),
    admin
      .from("bookings")
      .select(
        "id, title, starts_at, status, contacts(first_name, last_name, email)",
        { count: "exact" },
      )
      .eq("organization_id", orgId)
      .eq("status", "scheduled")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in30Days.toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
    admin
      .from("unmatched_emails")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("org_automations")
      .select("is_enabled")
      .eq("organization_id", orgId)
      .eq("service_key", "email-auto-ack")
      .maybeSingle(),
    admin
      .from("email_rules")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_enabled", true),
    admin
      .from("email_templates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("email_activity")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", weekAgo.toISOString()),
  ]);

  const googleConnection = googleRes.data;
  const twilioConnection = twilioRes.data;
  const arketaCount = arketaRes.count ?? 0;
  const teamCount = teamRes.count ?? 0;
  const activeAutomations = automationRes.count ?? 0;
  const contacts = contactsRes.data ?? [];
  const stages = stagesRes.data ?? [];
  const upcomingBookings = bookingsRes.data ?? [];
  const unmatchedCount = unmatchedRes.count ?? 0;

  const googleConnected = Boolean(googleConnection?.connected_email);
  const autoAckOn = Boolean(autoAckRes.data?.is_enabled);
  const enabledRulesCount = rulesRes.count ?? 0;
  const templatesCount = templatesRes.count ?? 0;
  const recentActivityCount = activityRes.count ?? 0;

  const setupSteps: SetupStep[] = [
    {
      id: "google",
      title: "Connect Google",
      description: googleConnected
        ? `Connected as ${googleConnection?.connected_email}`
        : "Link the business Gmail this workspace should watch and reply from.",
      href: "/dashboard/integrations",
      actionLabel: googleConnected ? "Manage" : "Open Integrations",
      done: googleConnected,
      critical: true,
    },
    {
      id: "auto-ack",
      title: "Turn on inquiry auto-reply",
      description: autoAckOn
        ? "Auto-reply is enabled for this workspace."
        : "Enable Inquiry auto-reply under Automation.",
      href: "/dashboard/automation",
      actionLabel: autoAckOn ? "Open Automation" : "Open Automation",
      done: autoAckOn,
      critical: true,
    },
    {
      id: "rules",
      title: "Add at least one email rule",
      description:
        enabledRulesCount > 0
          ? `${enabledRulesCount} enabled rule${enabledRulesCount === 1 ? "" : "s"}`
          : "Rules decide who gets a reply — so not every message becomes a lead.",
      href: "/dashboard/email-rules",
      actionLabel: enabledRulesCount > 0 ? "Open rules" : "Open rules",
      done: enabledRulesCount > 0,
      critical: true,
    },
    {
      id: "template",
      title: "Confirm a reply template",
      description:
        templatesCount > 0
          ? `${templatesCount} template${templatesCount === 1 ? "" : "s"} ready`
          : "Templates are the text auto-reply sends.",
      href: "/dashboard/templates",
      actionLabel: templatesCount > 0 ? "Open templates" : "Open templates",
      done: templatesCount > 0,
      critical: false,
    },
    {
      id: "test",
      title: "Prove it with a real email",
      description: recentActivityCount > 0
        ? `${recentActivityCount} email event${recentActivityCount === 1 ? "" : "s"} in the last 7 days`
        : googleConnected
          ? `Send a test message to ${googleConnection?.connected_email}, then check Automation activity.`
          : "Connect Google first, then email that inbox once.",
      href: "/dashboard/automation",
      actionLabel: "Open Automation",
      done: recentActivityCount > 0,
      critical: false,
    },
  ];

  const criticalRemaining = setupSteps.filter(
    (s) => s.critical && !s.done,
  ).length;
  const allCriticalDone = criticalRemaining === 0;
  const showSetupCard = isManager;

  const integrationsCount =
    (googleConnection ? 1 : 0) +
    (twilioConnection ? 1 : 0) +
    (arketaCount > 0 ? 1 : 0);

  const integrationDetail =
    [
      googleConnection ? "Google" : null,
      twilioConnection ? "SMS" : null,
      arketaCount > 0 ? `Arketa (${arketaCount})` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "None connected";

  const stageCounts =
    stages.length > 0
      ? stages.map((s) => ({
          id: s.id,
          name: s.name,
          count: contacts.filter((c) => c.pipeline_stage_id === s.id).length,
        }))
      : null;

  const statusPipeline = {
    lead: contacts.filter((c) => c.status === "lead").length,
    booked: contacts.filter((c) => c.status === "booked").length,
    customer: contacts.filter((c) => c.status === "customer").length,
    inactive: contacts.filter((c) => c.status === "inactive").length,
  };

  const recentContacts = contacts.slice(0, 5);
  const newThisWeek = contacts.filter(
    (c) => new Date(c.created_at) >= weekAgo,
  ).length;

  const metrics: OverviewMetric[] = [
    {
      href: "/dashboard/contacts",
      label: "Clients",
      value: contacts.length,
      detail:
        newThisWeek > 0
          ? `${newThisWeek} new this week`
          : "People in this workspace",
      icon: Contact,
    },
    {
      href: "/dashboard/bookings",
      label: "Schedule (30 days)",
      value: bookingsRes.count ?? 0,
      detail: "Scheduled ahead",
      icon: CalendarDays,
    },
    {
      href: "/dashboard/automation",
      label: "Autopilot on",
      value: activeAutomations,
      detail: "Enabled for this org",
      icon: Zap,
    },
    {
      href: "/dashboard/integrations",
      label: "Connections",
      value: integrationsCount,
      detail: integrationDetail,
      icon: Plug,
    },
    {
      href: "/dashboard/team",
      label: "Team",
      value: teamCount,
      detail: "With workspace access",
      icon: Users,
    },
    {
      href: "/dashboard/unmatched",
      label: "Unmatched email",
      value: unmatchedCount,
      detail: unmatchedCount > 0 ? "Needs a rule or contact" : "Inbox clear",
      icon: Inbox,
    },
  ];

  const nextStep =
    integrationsCount === 0
      ? {
          href: "/dashboard/integrations",
          title: "Connect Google or SMS",
          description:
            "Automations and calendar features need at least one connection.",
          action: "Connections",
        }
      : unmatchedCount > 0
        ? {
            href: "/dashboard/unmatched",
            title: `${unmatchedCount} unmatched email${unmatchedCount === 1 ? "" : "s"}`,
            description: "Review and attach to a contact or add a rule.",
            action: "Unmatched",
          }
        : activeAutomations === 0
          ? {
              href: "/dashboard/automation",
              title: "Turn on autopilot",
              description: "Auto-ack or reminders once tools are connected.",
              action: "Autopilot",
            }
          : contacts.length === 0
            ? {
                href: "/dashboard/forms",
                title: "Capture your first lead",
                description: "Share a form or add a contact manually.",
                action: "Forms",
              }
            : {
                href: "/dashboard/pipeline",
                title: "Work your journey",
                description: "Move people forward and keep follow-ups tight.",
                action: "Journey",
              };

  function contactName(c: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null) {
    if (!c) return "—";
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
    return name || c.email || "—";
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Today
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {active.orgName}
          </h1>
          <Link
            href="/dashboard/billing"
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              planId === "none"
                ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
            }`}
          >
            {planLabel}
          </Link>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Here is what is happening in your workspace today.
          {periodLabel
            ? ` Plan access through ${periodLabel}.`
            : planId === "none"
              ? " No active subscription — some tools are limited."
              : ""}{" "}
          <Link
            href="/dashboard/billing"
            className="font-medium text-slate-800 underline underline-offset-2"
          >
            Billing
          </Link>
          {" · "}
          Switch orgs under My workspaces.
        </p>
      </div>

      {showSetupCard && !allCriticalDone && (
        <FirstRunPanel
          orgName={active.orgName}
          steps={setupSteps}
          planIsNone={planId === "none"}
        />
      )}

      {showSetupCard && allCriticalDone && (
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-5 py-4">
          <p className="text-sm font-medium text-emerald-900">
            Inbox loop is ready
          </p>
          <p className="mt-1 text-sm text-emerald-800/80">
            Google, auto-reply, and at least one rule are in place. Use the
            snapshot below to run the workspace day to day.
          </p>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics
          .filter((m) =>
            ["Clients", "Schedule (30 days)", "Autopilot on", "Unmatched email"].includes(
              m.label,
            ),
          )
          .map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href + m.label}
                href={m.href}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">{m.label}</p>
                  <Icon className="h-4 w-4 text-slate-300 group-hover:text-slate-400" aria-hidden />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {m.value}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{m.detail}</p>
                <div
                  className="mt-3 h-8 w-full rounded-md bg-gradient-to-r from-sky-50 via-sky-100/80 to-sky-50 opacity-80"
                  aria-hidden
                  title="Trend chart placeholder"
                />
              </Link>
            );
          })}
      </section>

      <section>
        <Link
          href={nextStep.href}
          className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Suggested next
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {nextStep.title}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {nextStep.description}
            </p>
          </div>
          <span className="mt-3 inline-flex w-fit rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-medium text-white sm:mt-0">
            {nextStep.action}
          </span>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Today</h2>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {upcomingBookings.length === 0 ? (
              <li className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                No upcoming schedule items.
              </li>
            ) : (
              upcomingBookings.map((b) => {
                const c = Array.isArray(b.contacts)
                  ? b.contacts[0]
                  : b.contacts;
                const start = new Date(b.starts_at);
                const timeLabel = start.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                });
                return (
                  <li
                    key={b.id}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <div className="w-14 shrink-0 pt-0.5 text-xs font-medium text-slate-500">
                      {timeLabel}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {b.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {contactName(
                          c as {
                            first_name?: string | null;
                            last_name?: string | null;
                            email?: string | null;
                          } | null,
                        )}
                      </p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Journey</h2>
            <Link
              href="/dashboard/pipeline"
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              Open board
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {stageCounts && stageCounts.length > 0 ? (
              stageCounts.map((s) => {
                const max = Math.max(...stageCounts.map((x) => x.count), 1);
                const pct = Math.round((s.count / max) * 100);
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="tabular-nums text-slate-500">{s.count}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-500/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                {(
                  [
                    ["Lead", statusPipeline.lead],
                    ["Booked", statusPipeline.booked],
                    ["Customer", statusPipeline.customer],
                    ["Inactive", statusPipeline.inactive],
                  ] as const
                ).map(([label, count]) => {
                  const max = Math.max(
                    statusPipeline.lead,
                    statusPipeline.booked,
                    statusPipeline.customer,
                    statusPipeline.inactive,
                    1,
                  );
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{label}</span>
                        <span className="tabular-nums text-slate-500">{count}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500/80"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent clients
            </h2>
            <Link
              href="/dashboard/contacts"
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {recentContacts.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-500">
                No clients yet.
              </li>
            ) : (
              recentContacts.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/contacts/${c.id}`}
                      className="text-sm font-medium text-slate-900 hover:underline"
                    >
                      {contactName(c)}
                    </Link>
                    <p className="text-xs capitalize text-slate-500">
                      {c.status || "—"}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Workspace snapshot
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {metrics
              .filter(
                (m) =>
                  !["Clients", "Schedule (30 days)", "Autopilot on", "Unmatched email"].includes(
                    m.label,
                  ),
              )
              .map((m) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={m.href + m.label}
                    href={m.href}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs text-slate-500">
                        {m.label}
                      </p>
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    </div>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {m.value}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-400">
                      {m.detail}
                    </p>
                  </Link>
                );
              })}
          </div>
        </div>
      </section>
    </div>
  );
}
