import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plug,
  Users,
  Zap,
  CalendarDays,
  Contact,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";

type OverviewMetric = {
  href: string;
  label: string;
  value: number | string;
  detail: string;
  icon: typeof Zap;
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
  ] = await Promise.all([
    supabase
      .from("connections")
      .select("connected_email")
      .eq("organization_id", orgId)
      .eq("provider", "google")
      .maybeSingle(),
    supabase
      .from("twilio_connections")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle(),
    supabase
      .from("arketa_locations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("org_automations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_enabled", true),
    supabase
      .from("contacts")
      .select(
        "id, status, first_name, last_name, email, created_at, pipeline_stage_id",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("pipeline_stages")
      .select("id, name, slug, position, is_won, is_lost")
      .eq("organization_id", orgId)
      .order("position", { ascending: true }),
    supabase
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
    supabase
      .from("unmatched_emails")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
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

  const integrationsCount =
    (googleConnection ? 1 : 0) +
    (twilioConnection ? 1 : 0) +
    (arketaCount > 0 ? 1 : 0);

  const integrationDetail = [
    googleConnection ? "Google" : null,
    twilioConnection ? "SMS" : null,
    arketaCount > 0 ? `Arketa (${arketaCount})` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "None connected";

  // Prefer custom pipeline stages when present
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
          className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50"
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">{nextStep.title}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{nextStep.description}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-zinc-700">
            {nextStep.action} →
          </span>
        </Link>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900">Pipeline</h2>
          <Link
            href="/dashboard/pipeline"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            Open board
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stageCounts
            ? stageCounts.map((s) => (
                <Link
                  key={s.id}
                  href="/dashboard/pipeline"
                  className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50"
                >
                  <p className="text-xl font-semibold text-zinc-900">{s.count}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {s.name}
                  </p>
                </Link>
              ))
            : (
                [
                  { key: "lead", label: "Leads" },
                  { key: "booked", label: "Booked" },
                  { key: "customer", label: "Customers" },
                  { key: "inactive", label: "Inactive" },
                ] as const
              ).map((s) => (
                <Link
                  key={s.key}
                  href="/dashboard/contacts"
                  className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50"
                >
                  <p className="text-xl font-semibold text-zinc-900">
                    {statusPipeline[s.key]}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
                </Link>
              ))}
        </div>
        {contacts.length === 0 && (
          <p className="mt-3 text-sm text-zinc-500">
            No contacts in this workspace yet. Add one, import CSV, or share a
            form.
          </p>
        )}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900">
              Recent contacts
            </h2>
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
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div>
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
