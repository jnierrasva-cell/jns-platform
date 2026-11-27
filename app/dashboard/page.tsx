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
      .select("connected_email, needs_reauth, last_auth_error, watch_expiration")
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
        { count: "exact" },
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500),
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
      .select("id, status")
      .eq("organization_id", orgId)
      .gte("created_at", weekAgo.toISOString())
      .limit(200),
  ]);

  const queryErrors = [
    googleRes.error?.message,
    contactsRes.error?.message,
    stagesRes.error?.message,
    bookingsRes.error?.message,
    unmatchedRes.error?.message,
    activityRes.error?.message,
  ].filter(Boolean) as string[];
  const dataLoadError = queryErrors[0] ?? null;

  const googleConnection = googleRes.data;
  const twilioConnection = twilioRes.data;
  const arketaCount = arketaRes.count ?? 0;
  const teamCount = teamRes.count ?? 0;
  const activeAutomations = automationRes.count ?? 0;
  const contacts = contactsRes.data ?? [];
  const contactsTotal =
    typeof contactsRes.count === "number" ? contactsRes.count : contacts.length;
  const stages = stagesRes.data ?? [];
  const upcomingBookings = bookingsRes.data ?? [];
  const unmatchedCount = unmatchedRes.count ?? 0;

  const googleConnected = Boolean(googleConnection?.connected_email);
  const googleNeedsReauth = Boolean(
    googleConnection?.needs_reauth && googleConnected,
  );
  const googleHealthy = googleConnected && !googleNeedsReauth;
  const autoAckOn = Boolean(autoAckRes.data?.is_enabled);
  const enabledRulesCount = rulesRes.count ?? 0;
  const templatesCount = templatesRes.count ?? 0;
  const activityRows = activityRes.data ?? [];
  const recentActivityCount = activityRows.length;
  const successfulActivityCount = activityRows.filter(
    (r) => r.status === "sent" || r.status === "received",
  ).length;
  const failedActivityCount = activityRows.filter(
    (r) => r.status === "failed",
  ).length;

  const watchExpiration = googleConnection?.watch_expiration as
    | string
    | null
    | undefined;
  const watchExpired =
    googleHealthy &&
    autoAckOn &&
    (!watchExpiration ||
      Number.isNaN(new Date(watchExpiration).getTime()) ||
      new Date(watchExpiration).getTime() <= Date.now());

  const setupSteps: SetupStep[] = [
    {
      id: "google",
      title: googleNeedsReauth ? "Reconnect Google" : "Connect Google",
      description: googleNeedsReauth
        ? `Access expired for ${googleConnection?.connected_email}. Reconnect so inbox watch and auto-reply can run.`
        : googleConnected
          ? `Connected as ${googleConnection?.connected_email}`
          : "Link the business Gmail this workspace should watch and reply from.",
      href: "/dashboard/integrations",
      actionLabel: googleNeedsReauth
        ? "Reconnect"
        : googleConnected
          ? "Manage"
          : "Open Connections",
      done: googleHealthy,
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
        : googleHealthy
          ? `Send a test message to ${googleConnection?.connected_email}, then check Automations activity.`
          : googleNeedsReauth
            ? "Reconnect Google first, then send a test message to that inbox."
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
      googleNeedsReauth
        ? "Google (reconnect)"
        : googleConnection
          ? "Google"
          : null,
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
      value: dataLoadError ? "—" : contactsTotal,
      detail: dataLoadError
        ? "Could not load count"
        : newThisWeek > 0
          ? `${newThisWeek} new this week (sample)`
          : "In this workspace",
      icon: Contact,
    },
    {
      href: "/dashboard/bookings",
      label: "Bookings (30 days)",
      value: dataLoadError && bookingsRes.error ? "—" : bookingsRes.count ?? 0,
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
        dataLoadError && unmatchedRes.error
          ? "Could not load"
          : unmatchedCount > 0
            ? "Attach to a contact or add a rule"
            : "Inbox clear",
      icon: Inbox,
      attention: unmatchedCount > 0,
    },
  ];

  void statusPipeline;
  void successfulActivityCount;

  const nextStep =
    googleNeedsReauth
      ? {
          href: "/dashboard/integrations",
          title: "Reconnect Google",
          description:
            "Google access expired. Reconnect so auto-reply and calendar sync can run again.",
          action: "Open Connections",
          urgent: true,
        }
      : integrationsCount === 0
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
          : contactsTotal === 0
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

      {dataLoadError && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
          role="alert"
        >
          <p className="font-semibold">Some overview data failed to load</p>
          <p className="mt-1 text-red-700/90">{dataLoadError}</p>
          <p className="mt-1 text-red-700/80">
            Metrics below may be incomplete. Refresh the page or check service
            status.
          </p>
        </div>
      )}

      {showSetupCard && !allCriticalDone && (
        <FirstRunPanel
          organizationId={orgId}
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

      {isManager && googleNeedsReauth && (
        <Link
          href="/dashboard/integrations"
          className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 transition hover:border-amber-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950">
              Google needs to be reconnected
            </p>
            <p className="mt-0.5 text-sm text-amber-900/80">
              {(googleConnection?.last_auth_error as string | null)?.slice(
                0,
                160,
              ) ||
                "Access expired or was revoked. Reconnect so inbox auto-reply and calendar can run."}
            </p>
          </div>
          <span className="inline-flex min-h-[44px] w-fit shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
            Reconnect
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      )}

      {isManager && !googleNeedsReauth && watchExpired && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-600">
          Gmail push watch looks stale while auto-reply is on. Open Connections
          → Google and use reconnect if new mail is not showing up in activity.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.label}
              href={m.href}
              className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:border-sky-200 ${
                m.attention
                  ? "border-amber-200 ring-1 ring-amber-100"
                  : "border-slate-200/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {m.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {m.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{m.detail}</p>
                </div>
                <span className="rounded-xl bg-slate-50 p-2 text-slate-500">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {failedActivityCount > 0 && (
        <p className="text-sm text-amber-800">
          {failedActivityCount} email event{failedActivityCount === 1 ? "" : "s"}{" "}
          failed in the last 7 days. Check Automations activity.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
              Upcoming bookings
            </p>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-medium text-sky-700 hover:text-sky-800"
            >
              View all
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No scheduled bookings in the next 30 days.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {upcomingBookings.map((b) => {
                const contact = Array.isArray(b.contacts)
                  ? b.contacts[0]
                  : b.contacts;
                const when = bookingWhen(b.starts_at as string);
                return (
                  <li
                    key={b.id as string}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {(b.title as string) || "Appointment"}
                      </p>
                      <p className="text-slate-500">{contactName(contact)}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      <p>{when.dateLabel}</p>
                      <p>{when.timeLabel}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
              Recent people
            </p>
            <Link
              href="/dashboard/contacts"
              className="text-xs font-medium text-sky-700 hover:text-sky-800"
            >
              View all
            </Link>
          </div>
          {recentContacts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No people yet in this workspace.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentContacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/contacts/${c.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">
                      {contactName(c)}
                    </span>
                    <span className="text-xs capitalize text-slate-400">
                      {c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            Suggested next
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-900">
            {nextStep.title}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {nextStep.description}
          </p>
          <Link
            href={nextStep.href}
            className={`mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium ${
              nextStep.urgent
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-sky-600 text-white hover:bg-sky-700"
            }`}
          >
            {nextStep.action}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
              Journey
            </p>
            <Link
              href="/dashboard/pipeline"
              className="text-xs font-medium text-sky-700 hover:text-sky-800"
            >
              Open board
            </Link>
          </div>
          {stageCounts && stageCounts.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {stageCounts.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">{s.name}</span>
                  <span className="font-medium text-slate-900">{s.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              <p>No journey stages yet.</p>
              <Link
                href="/dashboard/pipeline"
                className="mt-2 inline-flex items-center gap-1 font-medium text-sky-700"
              >
                Set up Journey
                <Kanban className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
