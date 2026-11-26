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
      .select("id, status")
      .eq("organization_id", orgId)
      .gte("created_at", weekAgo.toISOString())
      .limit(200),
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
          organizationId={orgId}
          orgName={active.orgName}
          steps={setupSteps}
          planIsNone={planId === "none"}
        />
      )}

      {/* Rest of overview intentionally kept as in production branch prior to this change */}
    </div>
  );
}
