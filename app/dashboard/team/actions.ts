"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createInvite(
  organizationId: string,
  email: string,
  role: "admin" | "assistant" | "member",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership || !["ceo", "admin"].includes(membership.role)) {
    throw new Error("Not authorized to invite members");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    throw new Error("Enter a valid email");
  }

  const token = randomUUID();
  const admin = createAdminClient();

  const { error } = await admin.from("invites").insert({
    organization_id: organizationId,
    email: normalizedEmail,
    role,
    invited_by: user.id,
    token,
    status: "pending",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("id, organization_id")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) throw new Error("Invite not found");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", invite.organization_id)
    .maybeSingle();

  if (!membership || !["ceo", "admin"].includes(membership.role)) {
    throw new Error("Not authorized");
  }

  const { error } = await admin
    .from("invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}