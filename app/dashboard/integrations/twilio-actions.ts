"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireOrgMember(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");
  return { supabase, user, role: membership.role as string };
}

export async function saveTwilioConnection(input: {
  organizationId: string;
  accountSid: string;
  authToken: string;
  fromNumber: string;
}) {
  const { supabase, role } = await requireOrgMember(input.organizationId);

  // Only CEO (or admin) should connect billing-critical integrations
  if (role !== "ceo") {
    throw new Error("Only the workspace owner can connect Twilio");
  }

  const accountSid = input.accountSid.trim();
  const authToken = input.authToken.trim();
  const fromNumber = input.fromNumber.trim();

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Account SID, Auth Token, and From Number are required");
  }

  // Light validation: Twilio SIDs start with AC
  if (!accountSid.startsWith("AC")) {
    throw new Error("Account SID should start with AC");
  }

  const { error } = await supabase.from("twilio_connections").upsert(
    {
      organization_id: input.organizationId,
      account_sid: accountSid,
      auth_token: authToken,
      from_number: fromNumber,
      is_valid: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/integrations");
  revalidatePath("/dashboard");
}

export async function disconnectTwilio(organizationId: string) {
  const { supabase, role } = await requireOrgMember(organizationId);

  if (role !== "ceo") {
    throw new Error("Only the workspace owner can disconnect Twilio");
  }

  const { error } = await supabase
    .from("twilio_connections")
    .delete()
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/integrations");
  revalidatePath("/dashboard");
}