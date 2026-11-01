import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { getPlanGateState } from "@/lib/billing/org-plan";
import { PlanGateBanner } from "@/components/plan-gate-banner";
import { AutomationClient } from "@/components/automation-client";
import { EmailRulesClient } from "@/components/email-rules-client";
import { TemplateClient } from "@/components/template-client";
import { UnmatchedClient } from "@/components/unmatched-client";
import { AutopilotTabs, type AutopilotTab } from "@/components/autopilot-tabs";
import { mockServices } from "@/lib/mock-services";

const DEFAULT_TEMPLATES = [
  {
    template_key: "gmail_auto_ack",
    label: "Email auto-ack",
    subject: "Thanks for reaching out!",
    body: `Hi {{first_name}},

Thanks for getting in touch! We've received your message and someone from our team will follow up shortly.

Talk soon,
{{business_name}}`,
  },
  {
    template_key: "form_thanks",
    label: "Form thank-you",
    subject: "We received your form",
    body: `Hi {{first_name}},

Thanks for submitting the form. We'll review it and get back to you soon.

{{business_name}}`,
  },
];

function parseTab(value: string | string[] | undefined): AutopilotTab {
  const tab = Array.isArray(value) ? value[0] : value;
  if (tab === "rules" || tab === "templates" || tab === "unmatched") {
    return tab;
  }
  return "status";
}

export default async function AutopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab: requestedTab } = await searchParams;
  const activeTab = parseTab(requestedTab);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");
  if (active.role !== "ceo" && active.role !== "admin") {
    redirect("/dashboard");
  }

  const orgId = active.organizationId;
  const admin = createAdminClient();
  let content;

  if (activeTab === "status") {
    const gate = await getPlanGateState(orgId);
    const [automationsRes, settingsRes, googleRes, twilioRes, rulesRes, activityRes] =
      await Promise.all([
        admin
          .from("org_automations")
          .select("service_key, is_enabled")
          .eq("organization_id", orgId),
        admin
          .from("org_automation_settings")
          .select("service_key, settings")
          .eq("organization_id", orgId),
        admin
          .from("connections")
          .select("connected_email")
          .eq("organization_id", orgId)
          .eq("provider", "google")
          .maybeSingle(),
        admin
          .from("twilio_connections")
          .select("from_number")
          .eq("organization_id", orgId)
          .maybeSingle(),
        admin
          .from("email_rules")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("is_enabled", true),
        admin
          .from("email_activity")
          .select(
            "id, service_key, direction, status, subject, to_email, from_email, created_at",
          )
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

    const enabledKeys = (automationsRes.data ?? [])
      .filter((automation) => automation.is_enabled)
      .map((automation) => automation.service_key);
    const settingsByKey: Record<string, Record<string, unknown>> = {};
    for (const row of settingsRes.data ?? []) {
      settingsByKey[row.service_key] =
        (row.settings as Record<string, unknown>) ?? {};
    }

    content = (
      <>
        {!gate.limits.emailAutomation && (
          <PlanGateBanner
            title="Inbox automation needs Pro or Business"
            body="Turning on auto-reply or SMS reminders requires an active Pro or Business subscription."
          />
        )}
        <AutomationClient
          organizationId={orgId}
          services={mockServices}
          initialEnabledKeys={enabledKeys}
          initialSettings={settingsByKey}
          recentActivity={activityRes.data ?? []}
          googleConnected={Boolean(googleRes.data?.connected_email)}
          googleEmail={googleRes.data?.connected_email ?? null}
          twilioConnected={Boolean(twilioRes.data?.from_number)}
          twilioFrom={twilioRes.data?.from_number ?? null}
          enabledRulesCount={rulesRes.count ?? 0}
        />
      </>
    );
  } else if (activeTab === "rules") {
    const gate = await getPlanGateState(orgId);
    const { data: rules, error: rulesError } = await admin
      .from("email_rules")
      .select(
        "id, name, is_enabled, priority, from_email, from_domain, subject_contains, only_new_contact, action, tag, template_key, created_at",
      )
      .eq("organization_id", orgId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    const { data: templates, error: templatesError } = await admin
      .from("email_templates")
      .select("template_key")
      .eq("organization_id", orgId);

    if (rulesError) console.error("[email-rules] load failed:", rulesError);
    if (templatesError) {
      console.error("[email-rules] templates load failed:", templatesError);
    }

    const templateKeys = [
      "gmail_auto_ack",
      ...new Set((templates ?? []).map((template) => template.template_key)),
    ];

    content = (
      <>
        {!gate.limits.emailRules && (
          <PlanGateBanner
            title="Email rules need Pro or Business"
            body="You can view this area, but creating or enabling rules is locked until this workspace has an active Pro or Business plan."
          />
        )}
        <EmailRulesClient
          organizationId={orgId}
          rules={rules ?? []}
          rulesLoadError={
            rulesError
              ? "Could not load email rules. Please refresh and try again."
              : null
          }
          templateKeys={templateKeys}
        />
      </>
    );
  } else if (activeTab === "templates") {
    const { data: rows } = await supabase
      .from("email_templates")
      .select("template_key, subject, body, updated_at")
      .eq("organization_id", orgId)
      .order("template_key");
    const byKey = new Map((rows ?? []).map((row) => [row.template_key, row]));
    const templates = DEFAULT_TEMPLATES.map((template) => {
      const saved = byKey.get(template.template_key);
      return {
        template_key: template.template_key,
        label: template.label,
        subject: saved?.subject ?? template.subject,
        body: saved?.body ?? template.body,
      };
    });

    for (const row of rows ?? []) {
      if (!DEFAULT_TEMPLATES.some((template) => template.template_key === row.template_key)) {
        templates.push({
          template_key: row.template_key,
          label: row.template_key,
          subject: row.subject,
          body: row.body,
        });
      }
    }
    content = <TemplateClient orgId={orgId} templates={templates} />;
  } else {
    const { data: rows } = await supabase
      .from("unmatched_emails")
      .select(
        "id, from_email, from_name, subject, status, created_at, gmail_message_id",
      )
      .eq("organization_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    content = <UnmatchedClient organizationId={orgId} rows={rows ?? []} />;
  }

  return <AutopilotTabs activeTab={activeTab}>{content}</AutopilotTabs>;
}