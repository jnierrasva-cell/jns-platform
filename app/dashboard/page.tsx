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
  ArrowRight,
  Kanban,
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
  attention?: boolean;
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
      actionLabel: googleConnected ? "Manage" : "Open Connections",
      done: googleConnected,
      critical: true,
    },
    {
      id: "auto-ack",
      title: "Turn on inquiry auto-reply",
      description: autoAckOn
        ? "Auto-reply is enabled for this workspace."
        : "Enable Inquiry auto-reply under Automations.",
      href: "/dashboard/automation",
      actionLabel: "Open Automations",
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
      actionLabel: "Open rules",
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
      actionLabel: "Open templates",
      done: templatesCount > 0,
      critical: false,
    },
    {
      id: "test",
      title: "Prove it with a real email",
      description: recentActivityCount > 0
        ? `${recentActivityCount} email event${recentActivityCount === 1 ? "" : "s"} in the last 7 days`
        : googleConnected
          ? `Send a test message to ${googleConnection?.connected_email}, then check Automations activity.`
          : "Connect Google first, then email that inbox once.",
      href: "/dashboard/automation",
      actionLabel: "Open Automations",
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

  const peopleLabel =
    active.contactLabelPlural &&
    active.contactLabelPlural.toLowerCase() !== "contacts"
      ? active.contactLabelPlural
      : "People";

  const metrics: OverviewMetric[] = [
    {
      href: "/dashboard/contacts",
      label: peopleLabel,
      value: contacts.length,
      detail:
        newThisWeek > 0
          ? `${newThisWeek} new this week`
          : "In this workspace",
      icon: Contact,
    },
    {
      href: "/dashboard/bookings",
      label: "Bookings (30 days)",
      value: bookingsRes.count ?? 0,
      detail: "Scheduled ahead",
      icon: CalendarDays,
    },
    {
      href: "/dashboard/automation",
      label: "Automations on",
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
      label: "Needs review",
      value: unmatchedCount,
      detail:
        unmatchedCount > 0 ? "Attach to a contact or add a rule" : "Inbox clear",
      icon: Inbox,
      attention: unmatchedCount > 0,
    },
  ];

  const primaryMetricLabels = [
    peopleLabel,
    "Bookings (30 days)",
    "Automations on",
    "Needs review",
  ];

  const nextStep =
    integrationsCount === 0
      ? {
          href: "/dashboard/integrations",
          title: "Connect Google or SMS",
          description:
            "Automations and calendar features need at least one connection.",
          action: "Open Connections",
          urgent: true,
        }
      : unmatchedCount > 0
        ? {
            href: "/dashboard/unmatched",
            title: `${unmatchedCount} item${unmatchedCount === 1 ? "" : "s"} need review`,
            description:
              "Review and attach to a person, or add a rule so similar mail is handled next time.",
            action: "Review inbox",
            urgent: true,
          }
        : activeAutomations === 0
          ? {
              href: "/dashboard/automation",
              title: "Turn on automations",
              description:
                "Enable inquiry auto-reply or reminders once tools are connected.",
              action: "Open Automations",
              urgent: false,
            }
          : contacts.length === 0
            ? {
                href: "/dashboard/contacts",
                title: "Add your first person",
                description:
                  "Import a CSV, add someone manually, or share a form to start capturing leads.",
                action: "Open Clients",
                urgent: false,
              }
            : {
                href: "/dashboard/pipeline",
                title: "Work your journey board",
                description:
                  "Move people through stages and keep follow-ups tight.",
                action: "Open Journey",
                urgent: false,
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

  function bookingWhen(iso: string) {
    const start = new Date(iso);
    const dateLabel = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeLabel = start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return { dateLabel, timeLabel };
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          Home
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {active.orgName}
          </h1>
          <Link
            href="/dashboard/billing"
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition hover:opacity-90 ${
              planId === "none"
                ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
            }`}
          >
            {planLabel}
          </Link>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
          What needs attention in this workspace today.
          {periodLabel
            ? ` Plan access through ${periodLabel}.`
            : planId === "none"
              ? " Free tier — some tools are limited."
              : ""}{" "}
          <Link
            href="/dashboard/billing"
            className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
          >
            Billing
          </Link>
          {" · "}
          Switch orgs under My workspaces.
        </p>
      </div>

      {/* First-run setup */}
      {showSetupCard && !allCriticalDone && (
        <FirstRunPanel
          orgName={active.orgName}
          steps={setupSteps}
          planIsNone={planId === "none"}
        />
      )}

      {showSetupCard && allCriticalDone && unmatchedCount === 0 && (
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-5 py-4">
          <p className="text-sm font-medium text-emerald-900">
            Inbox loop is ready
          </p>
          <p className="mt-1 text-sm text-emerald-800/80">
            Google, auto-reply, and at least one rule are in place. Use the
            snapshot below to run the day.
          </p>
        </section>
      )}

      {/* Attention: unmatched inbox */}
      {isManager && unmatchedCount > 0 && (
        <Link
          href="/dashboard/unmatched"
          className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 transition hover:border-amber-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950">
              {unmatchedCount} message{unmatchedCount === 1 ? "" : "s"} need
              review
            </p>
            <p className="mt-0.5 text-sm text-amber-900/80">
              Attach to a person or add a rule so similar mail is handled
              automatically next time.
            </p>
          </div>
          <span className="inline-flex min-h-[44px] w-fit shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
            Review inbox
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      )}

      {/* Primary metrics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics
          .filter((m) => primaryMetricLabels.includes(m.label))
          .map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href + m.label}
                href={m.href}
                className={`group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                  m.attention
                    ? "border-amber-200 hover:border-amber-300"
                    : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">{m.label}</p>
                  <Icon
                    className={`h-4 w-4 ${
                      m.attention
                        ? "text-amber-500"
                        : "text-slate-300 group-hover:text-slate-400"
                    }`}
                    aria-hidden
                  />
                </div>
                <p
                  className={`mt-2 text-2xl font-semibold tracking-tight ${
                    m.attention ? "text-amber-900" : "text-slate-900"
                  }`}
                >
                  {m.value}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{m.detail}</p>
              </Link>
            );
          })}
      </section>

      {/* Suggested next */}
      <section>
        <Link
          href={nextStep.href}
          className={`flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between ${
            nextStep.urgent
              ? "border-sky-200 hover:border-sky-300"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
              Suggested next
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {nextStep.title}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{nextStep.description}</p>
          </div>
          <span className="inline-flex min-h-[44px] w-fit shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">
            {nextStep.action}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      </section>

      {/* Three-column snapshot */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming bookings */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming</h2>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-2.5">
            {upcomingBookings.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-8 text-center">
                <CalendarDays
                  className="mx-auto h-5 w-5 text-slate-300"
                  aria-hidden
                />
                <p className="mt-2 text-sm text-slate-500">
                  No upcoming bookings in the next 30 days.
                </p>
                <Link
                  href="/dashboard/bookings"
                  className="mt-3 inline-flex text-xs font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
                >
                  Open Schedule
                </Link>
              </li>
            ) : (
              upcomingBookings.map((b) => {
                const c = Array.isArray(b.contacts)
                  ? b.contacts[0]
                  : b.contacts;
                const { dateLabel, timeLabel } = bookingWhen(b.starts_at);
                return (
                  <li
                    key={b.id}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <div className="w-[4.25rem] shrink-0 pt-0.5">
                      <p className="text-[11px] font-medium text-slate-500">
                        {dateLabel}
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        {timeLabel}
                      </p>
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

        {/* Journey snapshot */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Journey</h2>
            <Link
              href="/dashboard/pipeline"
              className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
            >
              Open board
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {stageCounts ? (
              stageCounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-8 text-center">
                  <Kanban
                    className="mx-auto h-5 w-5 text-slate-300"
                    aria-hidden
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    No stages yet. Build your client lifecycle on the board.
                  </p>
                  <Link
                    href="/dashboard/pipeline"
                    className="mt-3 inline-flex text-xs font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
                  >
                    Set up Journey
                  </Link>
                </div>
              ) : (
                stageCounts.map((s) => {
                  const max = Math.max(...stageCounts.map((x) => x.count), 1);
                  const pct = Math.round((s.count / max) * 100);
                  return (
                    <div key={s.id}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-slate-600">
                          {s.name}
                        </p>
                        <p className="text-xs font-semibold text-slate-900">
                          {s.count}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              [
                ["Lead", statusPipeline.lead],
                ["Booked", statusPipeline.booked],
                ["Customer", statusPipeline.customer],
                ["Inactive", statusPipeline.inactive],
              ].map(([name, count]) => (
                <div
                  key={name as string}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">{name}</span>
                  <span className="font-semibold text-slate-900">
                    {count as number}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent people */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent {peopleLabel.toLowerCase()}
            </h2>
            <Link
              href="/dashboard/contacts"
              className="text-xs font-medium text-sky-700 underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {recentContacts.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-8 text-center">
                <Contact
                  className="mx-auto h-5 w-5 text-slate-300"
                  aria-hidden
                />
                <p className="mt-2 text-sm text-slate-500">
                  No one here yet. Add a person or import a CSV.
                </p>
                <Link
                  href="/dashboard/contacts"
                  className="mt-3 inline-flex text-xs font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
                >
                  Open Clients
                </Link>
              </li>
            ) : (
              recentContacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/contacts/${c.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50"
                  >
                    <span className="truncate text-sm font-medium text-slate-900">
                      {contactName(c)}
                    </span>
                    <span className="shrink-0 text-xs capitalize text-slate-400">
                      {c.status || "—"}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* Secondary metrics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metrics
          .filter((m) => !primaryMetricLabels.includes(m.label))
          .map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href + m.label}
                href={m.href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-100 group-hover:text-slate-500">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{m.label}</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {m.value}
                  </p>
                  <p className="truncate text-xs text-slate-500">{m.detail}</p>
                </div>
              </Link>
            );
          })}
      </section>
    </div>
  );
}
