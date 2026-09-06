"use server";

import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms/send";

export async function sendTestSms(organizationId: string, toPhone: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");
  if (membership.role !== "ceo") {
    throw new Error("Only the workspace owner can send a test SMS");
  }

  if (!toPhone.trim()) throw new Error("Enter a phone number");

  return sendSms({
    organizationId,
    toPhone: toPhone.trim(),
    body: "JNS test: your Twilio connection is working.",
  });
}