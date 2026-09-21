"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function consumeInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, organization_id, role, email, status")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) throw new Error("Invite not found");
  if (invite.status !== "pending") {
    throw new Error("This invite is no longer valid");
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("This invite was sent to a different email address");
  }

  // Already a member? Still mark invite accepted and set active org
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

  // Profile: approved + land in this org (skip broken onboarding)
  const { data: profile } = await admin
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  await admin
    .from("profiles")
    .update({
      status: "approved",
      active_organization_id: invite.organization_id,
      account_type: profile?.account_type ?? "individual",
    })
    .eq("id", user.id);

  await admin
    .from("invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  return { organizationId: invite.organization_id };
}