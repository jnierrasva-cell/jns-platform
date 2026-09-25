"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function switchOrganization(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Not authenticated" };
  }

  // Prove membership with the signed-in user
  const { data: membership, error: memberError } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (memberError) {
    return { ok: false as const, error: memberError.message };
  }
  if (!membership) {
    return {
      ok: false as const,
      error: "You are not a member of that organization",
    };
  }

  // Update active org with service role (avoids "permission denied for table users")
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({ active_organization_id: organizationId })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

  return { ok: true as const };
}