"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Login-first invite:
 * User must already be signed in. We only join them to the org.
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

  if (inviteError || !invite) throw new Error("Invite not found");
  if (invite.status === "accepted") {
    throw new Error("This invite was already used.");
  }
  if (invite.status === "revoked") {
    throw new Error("This invite was revoked.");
  }
  if (invite.status !== "pending") {
    throw new Error("This invite is no longer valid.");
  }

  const inviteEmail = invite.email.trim().toLowerCase();
  const userEmail = user.email.trim().toLowerCase();

  if (inviteEmail !== userEmail) {
    throw new Error(
      `This invite is for ${invite.email}. You are signed in as ${user.email}. Sign out and sign in with the invited email.`,
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

  return { organizationId: invite.organization_id };
}