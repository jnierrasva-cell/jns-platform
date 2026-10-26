"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { possessiveWorkspaceName } from "@/lib/names";

export async function setAccountType(
  type: "individual" | "business",
): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const meta = user.user_metadata as Record<string, string> | undefined;
  const firstName =
    profile?.first_name?.trim() ||
    meta?.first_name?.trim() ||
    "";

  // Sync metadata → profile if signup wrote metadata only
  if ((!profile?.first_name || !profile?.last_name) && (meta?.first_name || meta?.last_name)) {
    await admin
      .from("profiles")
      .update({
        first_name: meta?.first_name?.trim() || profile?.first_name || null,
        last_name: meta?.last_name?.trim() || profile?.last_name || null,
        account_type: type,
        status: "approved",
      })
      .eq("id", user.id);
  } else {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        account_type: type,
        status: "approved",
      })
      .eq("id", user.id);
    if (profileError) return { ok: false, error: profileError.message };
  }

  if (type === "business") {
    return { ok: true, next: "/onboarding/setup-business" };
  }

  const workspaceName = possessiveWorkspaceName(
    firstName || user.email?.split("@")[0] || "My",
  );

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
    .from("organizations")
    .update({ kind: "personal" })
    .eq("id", orgId as string);

  await admin
    .from("profiles")
    .update({ active_organization_id: orgId as string })
    .eq("id", user.id);

  return { ok: true, next: "/dashboard" };
}