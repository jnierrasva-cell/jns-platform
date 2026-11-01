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
import { SetupProgressRing } from "@/components/setup-progress-ring";
import { TodaySchedule } from "@/components/today-schedule";
import { Badge } from "@/components/ui/badge";

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
    inboundRes,
    matchedRes,
    sentRepliesRes,
    unmatchedArrivalsRes,
    bookedRes,
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
      .limit(100),
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
      .select(
        "id, service_key, direction, status, subject, to_email, from_email, created_at",
        { count: "exact" },
      )
      .eq("organization_id", orgId)
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(6),
    admin
      .from("email_activity")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("direction", "inbound")
      .gte("created_at", weekAgo.toISOString()),
    admin
      .from("email_activity")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("direction", "inbound")
      .not("rule_id", "is", null)
      .gte("created_at", weekAgo.toISOString()),
    admin
      .from("email_activity")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("direction", "outbound")
      .eq("status", "sent")
      .gte("created_at", weekAgo.toISOString()),
    admin
      .from("unmatched_emails")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", weekAgo.toISOString()),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "scheduled")
      .gte("created_at", weekAgo.toISOString()),
  ]);

  const googleConnection = googleRes.data;
  const twilioConnection = twilioRes.data;
  const arketaCount = arketaRes.count ?? 0;
  const teamCount = teamRes.count ?? 0;
  const activeAutomations = automationRes.count ?? 0;
  const contacts = contactsRes.data ?? [];
  const stages = stagesRes.data ?? [];
  const scheduleBookings = bookingsRes.data ?? [];
  const upcomingBookings = scheduleBookings.slice(0, 5);
  const unmatchedCount = unmatchedRes.count ?? 0;

  const googleConnected = Boolean(googleConnection?.connected_email);
  const autoAckOn = Boolean(autoAckRes.data?.is_enabled);
  const enabledRulesCount = rulesRes.count ?? 0;
  const templatesCount = templatesRes.count ?? 0;
  const recentActivityCount = activityRes.count ?? 0;
  const recentActivity = activityRes.data ?? [];
  const firstName =
    typeof user.user_metadata.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "";
  const greetingName = firstName || user.email?.split("@")[0] || "there";
  const flowIsSample = [
    inboundRes,
    matchedRes,
    sentRepliesRes,
    unmatchedArrivalsRes,
    bookedRes,
  ].some((result) => result.error || result.count === null);
  const inquiryFlow = flowIsSample
    ? [
        { label: "Email arrives", value: 18, detail: "Sample" },
        { label: "Rule matched", value: 11, detail: "Sample" },
        { label: "Reply sent", value: 7, detail: "Sample" },
        { label: "Booked", value: 3, detail: "Sample" },
      ]
    : [
        {
          label: "Email arrives",
          value: (inboundRes.count ?? 0) + (unmatchedArrivalsRes.count ?? 0),
          detail: "Past 7 days",
        },
        {
          label: "Rule matched",
          value: matchedRes.count ?? 0,
          detail: "Past 7 days",
        },
        {
          label: "Reply sent",
          value: sentRepliesRes.count ?? 0,
          detail: "Past 7 days",
        },
        {
          label: "Booked",
          value: bookedRes.count ?? 0,
          detail: "Past 7 days",
        },
      ];

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
        : "Enable inquiry auto-reply under Autopilot.",
      href: "/dashboard/autopilot?tab=status",
      actionLabel: "Open Autopilot",
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
      href: "/dashboard/autopilot?tab=rules",
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
      href: "/dashboard/autopilot?tab=templates",
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
      href: "/dashboard/autopilot?tab=status",
      actionLabel: "Open Autopilot",
      done: recentActivityCount > 0,
      critical: false,
    },
  ];

  const criticalRemaining = setupSteps.filter(
    (s) => s.critical && !s.done,
  ).length;
  const criticalTotal = setupSteps.filter((s) => s.critical).length || 1;
  const criticalDone = criticalTotal - criticalRemaining;
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
      href: "/dashboard/autopilot?tab=status",
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
      href: "/dashboard/autopilot?tab=unmatched",
      label: "Needs reply",
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
          action: "Integrations",
        }
      : unmatchedCount > 0
        ? {
              href: "/dashboard/autopilot?tab=unmatched",
            title: `${unmatchedCount} unmatched email${unmatchedCount === 1 ? "" : "s"}`,
            description: "Review and attach to a contact or add a rule.",
            action: "Unmatched",
          }
        : activeAutomations === 0
          ? {
              href: "/dashboard/autopilot?tab=status",
              title: "Turn on an automation",
              description: "Auto-ack or reminders once tools are connected.",
              action: "Automation",
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
                title: "Work your pipeline",
                description: "Move people forward and keep follow-ups tight.",
                action: "Pipeline",
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
    <div className="space-y-6 pb-6">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-text-muted">
            Today · {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-foreground">
            Welcome back, {greetingName}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {active.orgName}
            {periodLabel ? ` · Plan access through ${periodLabel}` : ""}
            {planId === "none" ? " · No active subscription" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="inline-flex min-h-11 items-center"
          title="View plan and billing"
        >
          <Badge variant={planId === "pro" ? "attention" : "secondary"}>
            {planLabel}
          </Badge>
        </Link>
      </header>

      {showSetupCard && !allCriticalDone && (
        <FirstRunPanel
          orgName={active.orgName}
          steps={setupSteps}
          planIsNone={planId === "none"}
        />
      )}

      {showSetupCard && allCriticalDone && (
        <section className="flex items-center gap-4 rounded-2xl border border-success/30 bg-success/5 px-5 py-4">
          <SetupProgressRing done={criticalDone} total={criticalTotal} />
          <div>
            <p className="text-sm font-semibold text-success">Inbox loop is ready</p>
            <p className="mt-1 text-sm text-text-secondary">
              Google, auto-reply, and at least one rule are in place.
            </p>
          </div>
        </section>
      )}

      <section
        aria-label="Inquiry handled flow"
        className="rounded-2xl border border-border bg-surface-inset px-5 py-5 sm:px-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-text-muted">
              Inbox performance · past 7 days
            </p>
            <h2 className="mt-1 font-heading text-lg font-bold text-foreground">
              Inquiry handled
            </h2>
          </div>
          <Badge variant={flowIsSample ? "secondary" : "default"}>
            {flowIsSample ? "Sample data" : "Live data"}
          </Badge>
        </div>
        <ol className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-0">
          {inquiryFlow.map((step, index) => (
            <li
              key={step.label}
              className="min-w-0 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 first:sm:border-l-0 first:sm:pl-0"
            >
              <p className="truncate text-xs font-medium text-text-secondary">
                <span className="mr-1 text-accent-cyan">0{index + 1}</span>
                {step.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {step.value}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href + m.label}
              href={m.href}
              className="min-h-32 rounded-2xl border border-border bg-card p-5 text-card-foreground transition hover:border-accent-cyan/50 hover:bg-surface-inset"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-text-muted">
                  {m.label}
                </p>
                <Icon className="h-4 w-4 text-text-muted" aria-hidden />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
                {m.value}
              </p>
              <p className="mt-1 truncate text-xs text-text-secondary">{m.detail}</p>
            </Link>
          );
        })}
      </section>

      <TodaySchedule bookings={scheduleBookings} />

      <section>
        <Link
          href={nextStep.href}
          className="flex min-h-24 flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition hover:border-accent-cyan/50 hover:bg-surface-inset sm:flex-row sm:items-center"
        >
          <div>
            <p className="text-xs font-semibold uppercase text-text-muted">
              Suggested next
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {nextStep.title}
            </p>
            <p className="mt-0.5 text-sm text-text-secondary">
              {nextStep.description}
            </p>
          </div>
          <span className="inline-flex min-h-11 w-fit items-center rounded-xl bg-[image:var(--accent-gradient)] px-4 text-sm font-semibold text-[#0A0E1A]">
            {nextStep.action}
          </span>
        </Link>
      </section>

      {/* Pipeline snapshot */}
      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-foreground">Journey</h2>
          <Link
            href="/dashboard/pipeline"
            className="inline-flex min-h-11 items-center text-sm font-medium text-text-secondary underline underline-offset-2 hover:text-foreground"
          >
            Open Journey
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stageCounts
            ? stageCounts.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-surface-inset px-3 py-3"
                >
                  <p className="truncate text-xs text-text-secondary">{s.name}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {s.count}
                  </p>
                </div>
              ))
            : (
                <>
                  {(
                    [
                      ["Lead", statusPipeline.lead],
                      ["Booked", statusPipeline.booked],
                      ["Customer", statusPipeline.customer],
                      ["Inactive", statusPipeline.inactive],
                    ] as const
                  ).map(([name, count]) => (
                    <div
                      key={name}
                      className="rounded-xl border border-border bg-surface-inset px-3 py-3"
                    >
                      <p className="text-xs text-text-secondary">{name}</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {count}
                      </p>
                    </div>
                  ))}
                </>
              )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Contact className="h-4 w-4 text-text-muted" aria-hidden />
              <h2 className="font-heading text-base font-bold text-foreground">
                Recent clients
              </h2>
            </div>
            <Link
              href="/dashboard/contacts"
              className="inline-flex min-h-11 items-center text-sm font-medium text-text-secondary underline underline-offset-2 hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {recentContacts.length === 0 ? (
              <li className="py-5 text-center text-sm text-text-muted">
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
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {contactName(c)}
                    </Link>
                    <p className="text-xs capitalize text-text-secondary">
                      {c.status || "—"}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-text-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-text-muted" aria-hidden />
              <h2 className="font-heading text-base font-bold text-foreground">
                Upcoming schedule
              </h2>
            </div>
            <Link
              href="/dashboard/bookings"
              className="inline-flex min-h-11 items-center text-sm font-medium text-text-secondary underline underline-offset-2 hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {upcomingBookings.length === 0 ? (
              <li className="py-5 text-center text-sm text-text-muted">
                No bookings in the next 30 days.
              </li>
            ) : (
              upcomingBookings.map((b) => {
                const c = Array.isArray(b.contacts)
                  ? b.contacts[0]
                  : b.contacts;
                return (
                  <li
                    key={b.id}
                    className="flex items-start justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {b.title}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {contactName(
                          c as {
                            first_name?: string | null;
                            last_name?: string | null;
                            email?: string | null;
                          } | null,
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-text-muted">
                      {new Date(b.starts_at).toLocaleString()}
                    </p>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-bold text-foreground">
            Recent activity
          </h2>
          <Badge variant="secondary">Past 7 days</Badge>
        </div>
        {recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">No email activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recentActivity.map((activity) => (
              <li
                key={activity.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-1 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {activity.subject || activity.service_key || "Email event"}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {activity.direction ?? "Email"} · {activity.status ?? "Logged"}
                    {activity.from_email ? ` · ${activity.from_email}` : ""}
                  </p>
                </div>
                <time
                  dateTime={activity.created_at}
                  className="shrink-0 text-xs text-text-muted"
                >
                  {new Date(activity.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
