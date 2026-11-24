"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultPipelineStages } from "@/lib/pipeline/seed-default-stages";
import { startProTrial } from "@/lib/billing/trial";
import { MAX_WORKSPACES_PER_USER } from "@/lib/org/workspace-limits";

function setActiveOrgCookie(organizationId: string) {
  return cookies().then((jar) => {
    jar.set("jns_active_org", organizationId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  });
}

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
      error: "You are not a member of that workspace",
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

  await setActiveOrgCookie(organizationId);

  return { ok: true as const, organizationId };
}

/**
 * Create an additional business workspace for any signed-in user.
 * Caller becomes Owner (ceo via RPC). Soft-capped per user.
 * Each workspace gets its own 14-day Pro trial (billing is per-workspace).
 */
export async function createWorkspace(name: string): Promise<
  | { ok: true; organizationId: string; next: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Workspace name is required" };
  }
  if (trimmed.length > 120) {
    return { ok: false, error: "Name must be 120 characters or fewer" };
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

  const { count, error: countError } = await supabase
    .from("org_members")
    .select("organization_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return { ok: false, error: countError.message };
  }

  if ((count ?? 0) >= MAX_WORKSPACES_PER_USER) {
    return {
      ok: false,
      error: `You can have up to ${MAX_WORKSPACES_PER_USER} workspaces. Remove one or contact support if you need more.`,
    };
  }

  const { data: orgId, error: orgError } = await supabase.rpc(
    "create_organization_with_ceo",
    { business_name: trimmed },
  );

  if (orgError || !orgId) {
    return {
      ok: false,
      error: orgError?.message ?? "Could not create workspace",
    };
  }

  const organizationId = orgId as string;

  const { error: kindError } = await admin
    .from("organizations")
    .update({ kind: "business" })
    .eq("id", organizationId);

  if (kindError) {
    console.error("[createWorkspace] kind update failed", kindError.message);
  }

  await ensureDefaultPipelineStages(organizationId);
  await startProTrial(organizationId);

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      active_organization_id: organizationId,
      status: "approved",
    })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  await setActiveOrgCookie(organizationId);

  return {
    ok: true,
    organizationId,
    next: "/dashboard/workspace?welcome=1",
  };
}
