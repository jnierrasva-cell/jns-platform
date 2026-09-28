"use server";

import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase
    .from("profiles")
    .update({
      account_type: type,
      status: "approved",
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (type === "business") {
    return { ok: true, next: "/onboarding/setup-business" };
  }

  // Individual: create a personal workspace
  const emailPrefix =
    user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, " ") || "Personal";
  const workspaceName = `${emailPrefix} workspace`.trim();

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

  await supabase
    .from("profiles")
    .update({ active_organization_id: orgId })
    .eq("id", user.id);

  return { ok: true, next: "/dashboard" };
}
