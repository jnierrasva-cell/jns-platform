import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Plug,
  Sparkles,
  Users,
  Zap,
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
        : {
            href: "/dashboard/automation",
            eyebrow: "Workspace status",
            title: "Your workspace is taking shape",
            description:
              "Keep building on your connected tools and active workflows as your operations grow.",
            action: "Manage automation",
          };

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
            See the systems currently supporting your customer operations and the next opportunity to simplify the work.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Workspace active
        </span>
      </div>

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
                  <ArrowRight className="mt-1 h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-200" aria-hidden="true" />
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
              <Sparkles className="h-5 w-5 shrink-0 text-cyan-200" aria-hidden="true" />
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white">
              {nextStep.action}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
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
              <dd className="font-medium text-white">{teamCount ?? 1} members</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
