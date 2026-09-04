"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startGmailWatch, stopGmailWatch } from "@/lib/google/watch";

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

  // Gmail auto-ack: start/stop watch with the toggle
  if (serviceKey === "email-auto-ack") {
    try {
      if (isEnabled) {
        await startGmailWatch(organizationId);
      } else {
        await stopGmailWatch(organizationId);
      }
    } catch (watchErr) {
      // Surface watch errors so user knows Push is not active
      throw new Error(
        watchErr instanceof Error
          ? watchErr.message
          : "Failed to update Gmail watch",
      );
    }
  }

  revalidatePath("/dashboard/automation");
  revalidatePath("/dashboard");
}