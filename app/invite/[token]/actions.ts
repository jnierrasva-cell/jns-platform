"use server";

import { createClient } from "@/lib/supabase/server";

export async function consumeInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("id, organization_id, role, email, status")
    .eq("token", token)
    .single();

  if (inviteError || !invite) throw new Error("Invite not found");
  if (invite.status !== "pending") throw new Error("This invite is no longer valid");
  if (invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    throw new Error("This invite was sent to a different email address");
  }

  const { error: memberError } = await supabase.from("org_members").insert({
    organization_id: invite.organization_id,
    user_id: user.id,
    role: invite.role,
  });
  if (memberError) throw new Error(memberError.message);

  // Invited team members skip the manual approval queue entirely —
  // their CEO's invite is the approval.
  await supabase
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", user.id);

  await supabase
    .from("invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);
}