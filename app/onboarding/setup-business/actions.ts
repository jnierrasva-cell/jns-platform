"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createOrganization(
  businessName: string,
): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.status === "rejected") {
    return {
      ok: false,
      error: "This account cannot access a JNS workspace.",
    };
  }

  if (!businessName.trim()) {
    return { ok: false, error: "Business name is required" };
  }

  const { data: orgId, error } = await supabase.rpc(
    "create_organization_with_ceo",
    { business_name: businessName.trim() },
  );

  if (error || !orgId) {
    return {
      ok: false,
      error: error?.message ?? "Could not create organization",
    };
  }

  const { data: organization, error: kindError } = await admin
    .from("organizations")
    .update({ kind: "business" })
    .eq("id", orgId as string)
    .select("id")
    .maybeSingle();

  if (kindError) {
    return { ok: false, error: kindError.message };
  }
  if (!organization) {
    return { ok: false, error: "Could not mark organization as a business." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      active_organization_id: orgId as string,
      account_type: "business",
      status: "approved",
    })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  return { ok: true, next: "/dashboard/workspace?welcome=1" };
}
