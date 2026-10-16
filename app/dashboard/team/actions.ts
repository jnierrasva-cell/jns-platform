"use server";

import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgManager } from "@/lib/org/auth";
import { revalidatePath } from "next/cache";

export async function createInvite(
  organizationId: string,
  email: string,
  role: "admin" | "assistant" | "member",
) {
  const { user } = await requireOrgManager(organizationId);

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
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invites")
    .select("id, organization_id")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) throw new Error("Invite not found");

  await requireOrgManager(invite.organization_id);

  const { error } = await admin
    .from("invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}