"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendAutoAck } from "@/lib/google/send-auto-ack";

export async function saveEmailTemplate(
  organizationId: string,
  subject: string,
  body: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!subject.trim()) throw new Error("Subject is required");
  if (!body.trim()) throw new Error("Message body is required");

  const { error } = await supabase.from("email_templates").upsert(
    {
      organization_id: organizationId,
      template_key: "gmail_auto_ack",
      subject: subject.trim(),
      body: body.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,template_key" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/templates");
}

export async function sendTestAutoAck(
  organizationId: string,
  toEmail: string,
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

  if (!toEmail.trim() || !toEmail.includes("@")) {
    throw new Error("Enter a valid email address");
  }

  // Ensure automation is on for a real test of the full path
  const { data: automation } = await supabase
    .from("org_automations")
    .select("is_enabled")
    .eq("organization_id", organizationId)
    .eq("service_key", "email-auto-ack")
    .maybeSingle();

  if (!automation?.is_enabled) {
    throw new Error(
      "Turn on Auto-Acknowledgment in Automation first, then try again.",
    );
  }

  const result = await sendAutoAck({
    organizationId,
    toEmail: toEmail.trim(),
    firstName: "there",
  });

  if (result.skipped) {
    throw new Error("Send was skipped. Check that automation is enabled.");
  }

  return { messageId: result.messageId };
}