import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { AutomationClient } from "@/components/automation-client";
import { mockServices } from "@/lib/mock-services";

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
  const admin = createAdminClient();

  const [
    automationsRes,
    settingsRes,
    googleRes,
    twilioRes,
    rulesRes,
    activityRes,
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
    .filter((a) => a.is_enabled)
    .map((a) => a.service_key);

  const settingsByKey: Record<string, Record<string, unknown>> = {};
  for (const row of settingsRes.data ?? []) {
    settingsByKey[row.service_key] =
      (row.settings as Record<string, unknown>) ?? {};
  }

  return (
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
  );
}