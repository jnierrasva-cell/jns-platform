import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Plug,
  Sparkles,
  Users,
  Zap,
  Contact,
  CalendarDays,
} from "lucide-react";
import { mockServices } from "@/lib/mock-services";
import { createClient } from "@/lib/supabase/server";

type OverviewMetric = {
  href: string;
  label: string;
  value: number;
  detail: string;
  icon: typeof Zap;
};

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const orgId = membership?.organization_id;

  const { data: googleConnection } = await supabase
    .from("connections")
    .select("connected_email")
    .eq("organization_id", orgId)
    .eq("provider", "google")
    .maybeSingle();

  const { data: twilioConnection } = await supabase
    .from("twilio_connections")
    .select("id")
    .eq("organization_id", orgId)
    .maybeSingle();

  const { count: teamCount } = await supabase
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  const { count: enabledAutomations } = await supabase
    .from("org_automations")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_enabled", true);

  const integrationsCount =
    (googleConnection ? 1 : 0) + (twilioConnection ? 1 : 0);
  const activeAutomations = enabledAutomations ?? 0;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: allContacts } = await supabase
    .from("contacts")
    .select("id, status, first_name, last_name, email, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const contacts = allContacts ?? [];
  const pipeline = {
    lead: contacts.filter((c) => c.status === "lead").length,
    booked: contacts.filter((c) => c.status === "booked").length,
    customer: contacts.filter((c) => c.status === "customer").length,
    inactive: contacts.filter((c) => c.status === "inactive").length,
  };

  const newLeads = contacts
    .filter((c) => new Date(c.created_at) >= weekAgo)
    .slice(0, 5);

  const { data: upcomingBookings } = await supabase
    .from("bookings")
    .select(
      "id, title, starts_at, status, contacts(first_name, last_name, email)",
    )
    .eq("organization_id", orgId)
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in7Days.toISOString())
    .order("starts_at", { ascending: true })
    .limit(5);

  const metrics: OverviewMetric[] = [
    {
      href: "/dashboard/automation",
      label: "Automations active",
      value: activeAutomations,
      detail: `of ${mockServices.length} available workflows`,
      icon: Zap,
    },
    {
      href: "/dashboard/integrations",
      label: "Tools connected",
      value: integrationsCount,
      detail: googleConnection
        ? `Google connected as ${googleConnection.connected_email}`
        : "Connect the tools you use every day",
      icon: Plug,
    },
    {
      href: "/dashboard/team",
      label: "Team members",
      value: teamCount ?? 1,
      detail: "People with workspace access",
      icon: Users,
    },
  ];

  const nextStep =
    integrationsCount === 0
      ? {
          href: "/dashboard/integrations",
          eyebrow: "Suggested next step",
          title: "Connect your first business tool",
          description:
            "Link a service to start bringing your workflow into one place.",
          action: "View integrations",
        }
      : activeAutomations === 0
        ? {
            href: "/dashboard/automation",
            eyebrow: "Suggested next step",
            title: "Activate an automation",
            description:
              "Choose a ready-to-use workflow to reduce repetitive follow-up.",
            action: "Explore automation",
          }
        : pipeline.lead > 0
          ? {
              href: "/dashboard/contacts?stage=lead",
              eyebrow: "Suggested next step",
              title: `${pipeline.lead} lead${pipeline.lead === 1 ? "" : "s"} waiting`,
              description:
                "Review new leads, add notes, and move them through your pipeline.",
              action: "Open leads",
            }
          : {
              href: "/dashboard/forms",
              eyebrow: "Workspace status",
              title: "Your workspace is taking shape",
              description:
                "Share an intake form or booking link to start capturing demand.",
              action: "View forms",
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
    <div className="pb-4">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Workspace overview
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            A clearer view of your business.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Pipeline, new leads, and the systems supporting your customer
            operations.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Workspace active
        </span>
      </div>

      {/* Metrics */}
      <section className="mt-8" aria-label="Workspace metrics">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="group rounded-xl border border-white/10 bg-white/[0.035] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-400/10 text-cyan-200">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="mt-1 h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-200"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-tight text-white">
                  {metric.value}
                </p>
                <h2 className="mt-1 text-sm font-medium text-slate-200">
                  {metric.label}
                </h2>
                <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">
                  {metric.detail}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pipeline strip */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-white">Pipeline</h2>
          <Link
            href="/dashboard/contacts"
            className="text-xs text-cyan-200 underline underline-offset-2 hover:text-cyan-100"
          >
            View contacts
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { key: "lead", label: "Leads", href: "/dashboard/contacts" },
              { key: "booked", label: "Booked", href: "/dashboard/contacts" },
              {
                key: "customer",
                label: "Customers",
                href: "/dashboard/contacts",
              },
              {
                key: "inactive",
                label: "Inactive",
                href: "/dashboard/contacts",
              },
            ] as const
          ).map((s) => (
            <Link
              key={s.key}
              href={s.href}
              className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-blue-400/30 hover:bg-white/[0.06]"
            >
              <p className="text-2xl font-semibold text-white">
                {pipeline[s.key]}
              </p>
              <p className="mt-1 text-xs text-slate-400">{s.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Next step + at a glance */}
      <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Link
          href={nextStep.href}
          className="group relative overflow-hidden rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.16] via-[#152654] to-[#101a37] p-6 transition hover:border-cyan-300/35"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              {nextStep.eyebrow}
            </p>
            <div className="mt-5 flex items-start justify-between gap-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  {nextStep.title}
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                  {nextStep.description}
                </p>
              </div>
              <Sparkles
                className="h-5 w-5 shrink-0 text-cyan-200"
                aria-hidden="true"
              />
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white">
              {nextStep.action}
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </div>
        </Link>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            At a glance
          </p>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <dt className="text-slate-400">Connected services</dt>
              <dd className="font-medium text-white">{integrationsCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <dt className="text-slate-400">Active workflows</dt>
              <dd className="font-medium text-white">{activeAutomations}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Workspace access</dt>
              <dd className="font-medium text-white">
                {teamCount ?? 1} members
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* New leads + upcoming bookings */}
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Contact className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <h2 className="text-sm font-medium text-white">New leads</h2>
            </div>
            <Link
              href="/dashboard/contacts"
              className="text-xs text-cyan-200 underline underline-offset-2"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-white/5">
            {newLeads.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-400">
                No new contacts this week.
              </li>
            ) : (
              newLeads.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div>
                    <Link
                      href={`/dashboard/contacts/${c.id}`}
                      className="text-sm font-medium text-white hover:text-cyan-200"
                    >
                      {contactName(c)}
                    </Link>
                    <p className="text-xs capitalize text-slate-500">
                      {c.status}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays
                className="h-4 w-4 text-cyan-300"
                aria-hidden="true"
              />
              <h2 className="text-sm font-medium text-white">
                Upcoming bookings
              </h2>
            </div>
            <Link
              href="/dashboard/bookings"
              className="text-xs text-cyan-200 underline underline-offset-2"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-white/5">
            {(upcomingBookings ?? []).length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-400">
                No bookings in the next 7 days.
              </li>
            ) : (
              (upcomingBookings ?? []).map((b) => {
                const c = Array.isArray(b.contacts)
                  ? b.contacts[0]
                  : b.contacts;
                return (
                  <li
                    key={b.id}
                    className="flex items-start justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {b.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {contactName(
                          c as {
                            first_name?: string | null;
                            last_name?: string | null;
                            email?: string | null;
                          } | null,
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-slate-500">
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