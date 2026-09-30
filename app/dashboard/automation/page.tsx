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

  const orgId = active.organizationId;

  const { data: automations } = await supabase
    .from("org_automations")
    .select("service_key, is_enabled")
    .eq("organization_id", orgId);

  const enabledKeys = (automations ?? [])
    .filter((a) => a.is_enabled)
    .map((a) => a.service_key);

  const { data: settingsRows } = await supabase
    .from("org_automation_settings")
    .select("service_key, settings")
    .eq("organization_id", orgId);

  const settingsByKey: Record<string, Record<string, unknown>> = {};
  for (const row of settingsRows ?? []) {
    settingsByKey[row.service_key] =
      (row.settings as Record<string, unknown>) ?? {};
  }

  let recentActivity: {
    id: string;
    service_key: string | null;
    direction: string | null;
    status: string | null;
    subject: string | null;
    to_email: string | null;
    from_email: string | null;
    created_at: string;
  }[] = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("email_activity")
      .select(
        "id, service_key, direction, status, subject, to_email, from_email, created_at",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(25);
    recentActivity = data ?? [];
  } catch {
    recentActivity = [];
  }

  return (
    <AutomationClient
      organizationId={orgId}
      services={mockServices}
      initialEnabledKeys={enabledKeys}
      initialSettings={settingsByKey}
      recentActivity={recentActivity}
    />
  );
}
