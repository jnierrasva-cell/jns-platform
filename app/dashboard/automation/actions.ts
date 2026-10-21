"use server";

import { revalidatePath } from "next/cache";
import { requireOrgManager } from "@/lib/org/auth";
import { startGmailWatch, stopGmailWatch } from "@/lib/google/watch";
import {
  assertEmailAutomation,
  assertSmsReminders,
} from "@/lib/billing/org-plan";

export async function setAutomationEnabled(
  organizationId: string,
  serviceKey: string,
  isEnabled: boolean,
) {
  const { supabase } = await requireOrgManager(organizationId);

  if (isEnabled) {
    if (serviceKey === "sms-reminders") {
      await assertSmsReminders(organizationId);
    }
    if (
      serviceKey === "email-auto-ack" ||
      serviceKey === "email-follow-up" ||
      serviceKey === "form-thanks"
    ) {
      await assertEmailAutomation(organizationId);
    }
  }

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
  const { supabase } = await requireOrgManager(input.organizationId);

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