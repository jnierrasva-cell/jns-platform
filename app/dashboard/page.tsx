import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plug,
  Users,
  Zap,
  CalendarDays,
  Contact,
  Inbox,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";

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
  const isManager = active.role === "ceo" || active.role === "admin";
  const admin = createAdminClient();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
      )
      .eq("organization_id", orgId)
      .eq("status", "scheduled")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in7Days.toISOString())
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
      actionLabel: googleConnected ? "Manage" : "Connect",
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
      actionLabel: autoAckOn ? "Open" : "Enable",
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
      actionLabel: enabledRulesCount > 0 ? "Open" : "Add rule",
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
      actionLabel: templatesCount > 0 ? "Open" : "Edit templates",
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
      actionLabel: "View activity",
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
      label: "Contacts",
      value: contacts.length,
      detail:
        newThisWeek > 0
          ? `${newThisWeek} new this week`
          : "People in this workspace",
      icon: Contact,
    },
    {
      href: "/dashboard/bookings",
      label: "Bookings (7 days)",
      value: upcomingBookings.length,
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
      label: "Integrations",
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
          action: "Integrations",
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
    <div>
      <div className="border-b border-zinc-200 pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          Overview
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          {active.orgName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Live snapshot for this workspace. Switch orgs anytime under My orgs.
        </p>
      </div>

      {/* Setup checklist — managers only */}
      {showSetupCard && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                {allCriticalDone
                  ? "Inbox loop is ready"
                  : "Get the inbox loop working"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {allCriticalDone
                  ? "Google, auto-reply, and at least one rule are in place. Optional steps still help you prove and polish."
                  : "Connect the business email, turn on auto-reply, and set one rule so inquiries are handled without junk contacts."}
              </p>
            </div>
            <p className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-600">
              {allCriticalDone
                ? "Core setup complete"
                : `${criticalRemaining} core step${criticalRemaining === 1 ? "" : "s"} left`}
            </p>
          </div>

          <ul className="mt-5 space-y-3">
            {setupSteps.map((step) => (
              <li
                key={step.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-3 sm:flex-nowrap"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {step.done ? (
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="mt-0.5 h-5 w-5 shrink-0 text-zinc-300"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        step.done ? "text-zinc-700" : "text-zinc-900"
                      }`}
                    >
                      {step.title}
                      {step.critical && !step.done ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          Required
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {step.description}
                    </p>
                  </div>
                </div>
                <Link
                  href={step.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    step.done
                      ? "border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900"
                      : "bg-[#0B132B] text-white hover:bg-[#111e3a]"
                  }`}
                >
                  {step.actionLabel}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href + m.label}
              href={m.href}
              className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {m.label}
                </p>
                <Icon className="h-4 w-4 text-zinc-400" aria-hidden />
              </div>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">
                {m.value}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">{m.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-6">
        <Link
          href={nextStep.href}
          className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
              Suggested next
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {nextStep.title}
            </p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {nextStep.description}
            </p>
          </div>
          <span className="mt-3 inline-flex w-fit rounded-lg bg-[#0B132B] px-3 py-1.5 text-xs font-medium text-white sm:mt-0">
            {nextStep.action}
          </span>
        </Link>
      </section>

      {/* Pipeline snapshot */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900">Pipeline</h2>
          <Link
            href="/dashboard/pipeline"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            Open pipeline
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stageCounts
            ? stageCounts.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
                >
                  <p className="truncate text-xs text-zinc-500">{s.name}</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
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
                      className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3"
                    >
                      <p className="text-xs text-zinc-500">{name}</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-900">
                        {count}
                      </p>
                    </div>
                  ))}
                </>
              )}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Contact className="h-4 w-4 text-zinc-400" aria-hidden />
              <h2 className="text-sm font-medium text-zinc-900">
                Recent contacts
              </h2>
            </div>
            <Link
              href="/dashboard/contacts"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100">
            {recentContacts.length === 0 ? (
              <li className="py-5 text-center text-sm text-zinc-500">
                No contacts yet.
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
                      className="text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {contactName(c)}
                    </Link>
                    <p className="text-xs capitalize text-zinc-500">
                      {c.status || "—"}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-zinc-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-zinc-400" aria-hidden />
              <h2 className="text-sm font-medium text-zinc-900">
                Upcoming bookings
              </h2>
            </div>
            <Link
              href="/dashboard/bookings"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100">
            {upcomingBookings.length === 0 ? (
              <li className="py-5 text-center text-sm text-zinc-500">
                No bookings in the next 7 days.
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
                      <p className="text-sm font-medium text-zinc-900">
                        {b.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {contactName(
                          c as {
                            first_name?: string | null;
                            last_name?: string | null;
                            email?: string | null;
                          } | null,
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-zinc-400">
                      {new Date(b.starts_at).toLocaleString()}
                    </p>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
