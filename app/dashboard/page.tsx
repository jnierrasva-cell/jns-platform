import Link from "next/link";
import { ArrowRight, Plug, Users, Zap, Contact, CalendarDays } from "lucide-react";
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
      label: "Automations on",
      value: activeAutomations,
      detail: `${mockServices.length} available`,
      icon: Zap,
    },
    {
      href: "/dashboard/integrations",
      label: "Connected tools",
      value: integrationsCount,
      detail: googleConnection
        ? googleConnection.connected_email ?? "Google connected"
        : "None connected",
      icon: Plug,
    },
    {
      href: "/dashboard/team",
      label: "Team",
      value: teamCount ?? 1,
      detail: "With workspace access",
      icon: Users,
    },
  ];

  const nextStep =
    integrationsCount === 0
      ? {
          href: "/dashboard/integrations",
          title: "Connect a tool",
          description: "Link Google or SMS so automations can actually send.",
          action: "Integrations",
        }
      : activeAutomations === 0
        ? {
            href: "/dashboard/automation",
            title: "Turn on an automation",
            description: "Pick a workflow for replies or reminders.",
            action: "Automation",
          }
        : pipeline.lead > 0
          ? {
              href: "/dashboard/contacts?stage=lead",
              title: `${pipeline.lead} lead${pipeline.lead === 1 ? "" : "s"} waiting`,
              description: "Open the list, add notes, and move them forward.",
              action: "Contacts",
            }
          : {
              href: "/dashboard/forms",
              title: "Share a form or booking link",
              description: "Start capturing new inquiries into this workspace.",
              action: "Forms",
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
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="jns-kicker">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            Workspace
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pipeline, new leads, and upcoming bookings.
          </p>
        </div>
      </div>

      <section className="mt-6" aria-label="Workspace metrics">
        <div className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="jns-card group p-4 transition hover:bg-zinc-50"
              >
                <div className="flex items-start justify-between">
                  <Icon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                  <ArrowRight
                    className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
                  {metric.value}
                </p>
                <h2 className="mt-0.5 text-sm font-medium text-zinc-800">
                  {metric.label}
                </h2>
                <p className="mt-1 truncate text-xs text-zinc-500">{metric.detail}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900">Pipeline</h2>
          <Link href="/dashboard/contacts" className="jns-link text-xs">
            All contacts
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
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
              className="jns-card p-4 transition hover:bg-zinc-50"
            >
              <p className="text-xl font-semibold text-zinc-900">{pipeline[s.key]}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Link
          href={nextStep.href}
          className="jns-card group flex items-start justify-between gap-4 p-5 transition hover:bg-zinc-50"
        >
          <div>
            <p className="jns-kicker">Next</p>
            <h2 className="mt-1 text-base font-semibold text-zinc-900">
              {nextStep.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{nextStep.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-zinc-900">
              {nextStep.action}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </section>

      <section className="mt-6 grid gap-3 lg:grid-cols-2">
        <div className="jns-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Contact className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <h2 className="text-sm font-medium text-zinc-900">New leads</h2>
            </div>
            <Link href="/dashboard/contacts" className="jns-link text-xs">
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100">
            {newLeads.length === 0 ? (
              <li className="py-5 text-center text-sm text-zinc-500">
                No new contacts this week.
              </li>
            ) : (
              newLeads.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <Link
                      href={`/dashboard/contacts/${c.id}`}
                      className="text-sm font-medium text-zinc-900 hover:underline"
                    >
                      {contactName(c)}
                    </Link>
                    <p className="text-xs capitalize text-zinc-500">{c.status}</p>
                  </div>
                  <p className="shrink-0 text-xs text-zinc-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="jns-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <h2 className="text-sm font-medium text-zinc-900">Upcoming bookings</h2>
            </div>
            <Link href="/dashboard/bookings" className="jns-link text-xs">
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-zinc-100">
            {(upcomingBookings ?? []).length === 0 ? (
              <li className="py-5 text-center text-sm text-zinc-500">
                No bookings in the next 7 days.
              </li>
            ) : (
              (upcomingBookings ?? []).map((b) => {
                const c = Array.isArray(b.contacts) ? b.contacts[0] : b.contacts;
                return (
                  <li key={b.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{b.title}</p>
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
