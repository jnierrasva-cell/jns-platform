"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startGmailWatch, stopGmailWatch } from "@/lib/google/watch";

async function requireMember(organizationId: string) {
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
  return supabase;
}

export async function setAutomationEnabled(
  organizationId: string,
  serviceKey: string,
  isEnabled: boolean,
) {
  const supabase = await requireMember(organizationId);

  if (serviceKey === "sms-reminders" && isEnabled) {
    const { data: twilio } = await supabase
      .from("twilio_connections")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!twilio) {
      throw new Error(
        "Connect Twilio in Integrations before enabling SMS reminders.",
      );
    }
  }

  if (serviceKey === "email-auto-ack" && isEnabled) {
    const { data: google } = await supabase
      .from("connections")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("provider", "google")
      .maybeSingle();

    if (!google) {
      throw new Error(
        "Connect Google in Integrations before enabling inquiry auto-reply.",
      );
    }
  }

  // Block enabling coming-soon keys
  if (
    serviceKey === "email-follow-up" ||
    serviceKey === "form-thanks" ||
    serviceKey === "lead-intake-sorter"
  ) {
    throw new Error("This system is not available yet.");
  }

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

  if (serviceKey === "email-auto-ack") {
    try {
      if (isEnabled) await startGmailWatch(organizationId);
      else await stopGmailWatch(organizationId);
    } catch (watchErr) {
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

export async function saveAutomationSettings(input: {
  organizationId: string;
  serviceKey: string;
  settings: Record<string, unknown>;
}) {
  const supabase = await requireMember(input.organizationId);

  const { error } = await supabase.from("org_automation_settings").upsert(
    {
      organization_id: input.organizationId,
      service_key: input.serviceKey,
      settings: input.settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,service_key" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/automation");
}
