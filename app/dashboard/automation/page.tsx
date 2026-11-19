import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { getPlanGateState } from "@/lib/billing/org-plan";
import { PlanGateBanner } from "@/components/plan-gate-banner";
import { AutomationClient } from "@/components/automation-client";
import { AutomationRecipes } from "@/components/automation-recipes";
import { mockServices } from "@/lib/mock-services";
import { SYSTEM_RECIPES } from "@/lib/workflows/recipes";
import { listInstalledRecipeKeys } from "@/lib/workflows/install-recipe";

export default async function AutomationPage() {
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
  const gate = await getPlanGateState(orgId);
  const admin = createAdminClient();

  const [
    automationsRes,
    settingsRes,
    googleRes,
    twilioRes,
    rulesRes,
    activityRes,
    installedKeys,
  ] = await Promise.all([
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
      .select("connected_email, needs_reauth, watch_expiration")
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
    listInstalledRecipeKeys(orgId),
  ]);

  const enabledKeys = (automationsRes.data ?? [])
    .filter((a) => a.is_enabled)
    .map((a) => a.service_key);

  const settingsByKey: Record<string, Record<string, unknown>> = {};
  for (const row of settingsRes.data ?? []) {
    settingsByKey[row.service_key] =
      (row.settings as Record<string, unknown>) ?? {};
  }

  const googleConnected = Boolean(googleRes.data?.connected_email);
  const googleNeedsReauth = Boolean(
    googleRes.data?.needs_reauth && googleConnected,
  );
  const watchExpiration = googleRes.data?.watch_expiration as
    | string
    | null
    | undefined;
  const autoAckOn = enabledKeys.includes("email-auto-ack");
  const watchStale =
    googleConnected &&
    !googleNeedsReauth &&
    autoAckOn &&
    (!watchExpiration ||
      Number.isNaN(new Date(watchExpiration).getTime()) ||
      new Date(watchExpiration).getTime() <= Date.now());

  const recipeCards = SYSTEM_RECIPES.map((r) => ({
    key: r.key,
    name: r.name,
    description: r.description,
    category: r.category,
    triggerType: r.triggerType,
  }));

  return (
    <div className="space-y-8">
      {!gate.limits.emailAutomation && (
        <PlanGateBanner
          title="Inbox automation needs Pro or Business"
          body="Turning on auto-reply or SMS reminders requires an active Pro or Business subscription."
        />
      )}
      <AutomationRecipes
        organizationId={orgId}
        recipes={recipeCards}
        activeKeys={installedKeys}
      />
      <AutomationClient
        organizationId={orgId}
        services={mockServices}
        initialEnabledKeys={enabledKeys}
        initialSettings={settingsByKey}
        recentActivity={activityRes.data ?? []}
        googleConnected={googleConnected}
        googleEmail={googleRes.data?.connected_email ?? null}
        googleNeedsReauth={googleNeedsReauth}
        googleWatchStale={watchStale}
        twilioConnected={Boolean(twilioRes.data?.from_number)}
        twilioFrom={twilioRes.data?.from_number ?? null}
        enabledRulesCount={rulesRes.count ?? 0}
      />
    </div>
  );
}
