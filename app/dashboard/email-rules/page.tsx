import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { getPlanGateState } from "@/lib/billing/org-plan";
import { PlanGateBanner } from "@/components/plan-gate-banner";
import { EmailRulesClient } from "@/components/email-rules-client";

export default async function EmailRulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;
  const gate = await getPlanGateState(orgId);
  const admin = createAdminClient();

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

  if (rulesError) {
    console.error("[email-rules] load failed:", rulesError);
  }
  if (templatesError) {
    console.error("[email-rules] templates load failed:", templatesError);
  }

  const templateKeys = [
    "gmail_auto_ack",
    ...new Set((templates ?? []).map((t) => t.template_key)),
  ];

  return (
    <div>
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
          rulesError ? "Could not load email rules. Please refresh and try again." : null
        }
        templateKeys={templateKeys}
      />
    </div>
  );
}