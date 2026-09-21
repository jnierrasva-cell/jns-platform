"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Custom invite token flow:
 * 1) Validate token + pending status
 * 2) Create or update Auth user with password (email confirmed)
 * 3) Attach org membership + heal profile
 * 4) Mark invite accepted
 * Client must then signInWithPassword with the same email/password.
 */
export async function acceptInvite(token: string, password: string) {
  const trimmedToken = token.trim();
  const trimmedPassword = password;

  if (!trimmedToken) throw new Error("Invalid invite");
  if (!trimmedPassword || trimmedPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, organization_id, role, email, status")
    .eq("token", trimmedToken)
    .maybeSingle();

  if (inviteError || !invite) throw new Error("Invite not found");
  if (invite.status === "accepted") {
    throw new Error("This invite was already used. Sign in instead.");
  }
  if (invite.status === "revoked") {
    throw new Error("This invite was revoked.");
  }
  if (invite.status !== "pending") {
    throw new Error("This invite is no longer valid");
  }

  const email = invite.email.trim().toLowerCase();

  // Find existing profile/user by email
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, account_type")
    .eq("email", email)
    .maybeSingle();

  let userId = existingProfile?.id as string | undefined;

  if (userId) {
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password: trimmedPassword,
      email_confirm: true,
    });
    if (updateErr) throw new Error(updateErr.message);
  } else {
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: trimmedPassword,
        email_confirm: true,
      });

    if (createErr) {
      // Race: user exists in Auth but not profiles
      const msg = createErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        throw new Error(
          "An account with this email already exists. Use Sign in on /login with this password, or reset password. If you never set a password, ask the owner for a fresh invite after deleting the Auth user.",
        );
      }
      throw new Error(createErr.message);
    }

    userId = created.user?.id;
    if (!userId) throw new Error("Could not create user");
  }

  // Membership
  const { data: existingMember } = await admin
    .from("org_members")
    .select("user_id")
    .eq("organization_id", invite.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existingMember) {
    const { error: memberError } = await admin.from("org_members").insert({
      organization_id: invite.organization_id,
      user_id: userId,
      role: invite.role,
    });
    if (memberError) throw new Error(memberError.message);
  }

  // Profile heal (trigger may have created row on createUser)
  await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      status: "approved",
      account_type: existingProfile?.account_type ?? "individual",
      active_organization_id: invite.organization_id,
      role: "user",
    },
    { onConflict: "id" },
  );

  await admin
    .from("invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  return { email, organizationId: invite.organization_id };
}

/** @deprecated kept so old imports don't break; prefer acceptInvite */
export async function consumeInvite(token: string) {
  throw new Error("Use acceptInvite(token, password) instead");
}