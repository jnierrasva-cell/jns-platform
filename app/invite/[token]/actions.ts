"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteInfo = {
  id: string;
  organization_id: string;
  organization_name: string;
  role: string;
  email: string;
  status: string;
};

export async function getInviteInfo(
  token: string,
): Promise<{ ok: true; invite: InviteInfo } | { ok: false; error: string }> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, error: "This invite link isn’t valid." };
  }

  const admin = createAdminClient();

  const { data: invite, error } = await admin
    .from("invites")
    .select("id, organization_id, role, email, status")
    .eq("token", trimmed)
    .maybeSingle();

  if (error || !invite) {
    return {
      ok: false,
      error:
        "This invite link isn’t valid or has expired. Ask the workspace owner for a new one.",
    };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invite.organization_id)
    .maybeSingle();

  return {
    ok: true,
    invite: {
      id: invite.id,
      organization_id: invite.organization_id,
      organization_name: org?.name ?? "Workspace",
      role: invite.role,
      email: (invite.email as string).trim().toLowerCase(),
      status: invite.status,
    },
  };
}

/**
 * Login-first invite: user must already be signed in with the invited email.
 */
export async function joinWithInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("NOT_SIGNED_IN");
  }

  const admin = createAdminClient();
  const trimmedToken = token.trim();

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, organization_id, role, email, status")
    .eq("token", trimmedToken)
    .maybeSingle();

  if (inviteError || !invite) {
    throw new Error("This invite link is not valid.");
  }
  if (invite.status === "accepted") {
    // Already used — if they're a member, still park them in the org
    const { data: existing } = await admin
      .from("org_members")
      .select("user_id")
      .eq("organization_id", invite.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await setActiveOrg(admin, user.id, invite.organization_id);
      return { organizationId: invite.organization_id as string };
    }

    throw new Error(
      "This invite was already used. Sign in and open My orgs to find the workspace.",
    );
  }
  if (invite.status === "revoked") {
    throw new Error("This invite was cancelled. Ask the owner for a new link.");
  }
  if (invite.status !== "pending") {
    throw new Error("This invite is no longer valid.");
  }

  const inviteEmail = String(invite.email).trim().toLowerCase();
  const userEmail = user.email.trim().toLowerCase();

  if (inviteEmail !== userEmail) {
    throw new Error(
      `This invite is for ${invite.email}. You are signed in as ${user.email}. Sign out, then sign in with the invited email.`,
    );
  }

  const { data: existing } = await admin
    .from("org_members")
    .select("user_id")
    .eq("organization_id", invite.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await admin.from("org_members").insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role,
    });
    if (memberError) throw new Error(memberError.message);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  await admin
    .from("profiles")
    .update({
      status: "approved",
      account_type: profile?.account_type ?? "individual",
      active_organization_id: invite.organization_id,
    })
    .eq("id", user.id);

  await admin
    .from("invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  await setActiveOrg(admin, user.id, invite.organization_id as string);

  return { organizationId: invite.organization_id as string };
}

async function setActiveOrg(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  organizationId: string,
) {
  await admin
    .from("profiles")
    .update({ active_organization_id: organizationId })
    .eq("id", userId);

  const jar = await cookies();
  jar.set("jns_active_org", organizationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}