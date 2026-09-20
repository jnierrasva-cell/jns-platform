import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <AutomationClient
      organizationId={orgId}
      services={mockServices}
      initialEnabledKeys={enabledKeys}
    />
  );
}