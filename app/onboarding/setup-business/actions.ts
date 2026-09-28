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

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      active_organization_id: orgId as string,
      account_type: "business",
      status: "approved",
    })
    .eq("id", user.id);

  return { ok: true, next: "/dashboard" };
}
