"use server";

import { cookies } from "next/headers";
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

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({ active_organization_id: organizationId })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false as const, error: updateError.message };
  }

  // Confirm write
  const { data: check } = await admin
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (check?.active_organization_id !== organizationId) {
    return {
      ok: false as const,
      error: "Could not save active workspace (profile update did not stick)",
    };
  }

  // Cookie wins for the next dashboard render
  const jar = await cookies();
  jar.set("jns_active_org", organizationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true as const, organizationId };
}