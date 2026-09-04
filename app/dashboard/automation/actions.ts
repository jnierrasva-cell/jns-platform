"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setAutomationEnabled(
  organizationId: string,
  serviceKey: string,
  isEnabled: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");

  const { error } = await supabase.from("org_automations").upsert(
    {
      organization_id: organizationId,
      service_key: serviceKey,
      is_enabled: isEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,service_key" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard");
}