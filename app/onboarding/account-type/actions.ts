"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setAccountType(
  type: "individual" | "business",
): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      account_type: type,
      status: "approved",
    })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  if (type === "business") {
    return { ok: true, next: "/onboarding/setup-business" };
  }

  // Individual: personal workspace via SECURITY DEFINER RPC
  const emailPrefix =
    user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, " ") || "Personal";
  const workspaceName = `${emailPrefix} workspace`.trim();

  // RPC still runs as the user for auth.uid(); admin is not needed for rpc call
  const { data: orgId, error: orgError } = await supabase.rpc(
    "create_organization_with_ceo",
    { business_name: workspaceName },
  );

  if (orgError || !orgId) {
    return {
      ok: false,
      error: orgError?.message ?? "Could not create workspace",
    };
  }

  await admin
    .from("profiles")
    .update({ active_organization_id: orgId as string })
    .eq("id", user.id);

  return { ok: true, next: "/dashboard" };
}
