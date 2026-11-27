"use server";

import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgManager } from "@/lib/org/auth";
import { isInviteRole, type InviteRole } from "@/lib/org/roles";
import { revalidatePath } from "next/cache";
import { assertCanInvite, getOrgBilling } from "@/lib/billing/org-plan";
import { planLimits } from "@/lib/billing/plans";

export async function createInvite(
  organizationId: string,
  email: string,
  role: string,
) {
  const { user } = await requireOrgManager(organizationId);

  // Plan gate (feature + soft seat read) before token work
  await assertCanInvite(organizationId);

  if (!isInviteRole(role)) {
    throw new Error(
      "Invalid role. Invites may only use admin, assistant, or member.",
    );
  }
  const safeRole: InviteRole = role;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    throw new Error("Enter a valid email");
  }

  const token = randomUUID();
  const admin = createAdminClient();
  const billing = await getOrgBilling(organizationId);
  const limits = planLimits(billing);

  // Atomic path: advisory lock + count + insert in one DB function
  const { data: rpcRows, error: rpcError } = await admin.rpc(
    "create_invite_with_seat_check",
    {
      p_organization_id: organizationId,
      p_email: normalizedEmail,
      p_role: safeRole,
      p_invited_by: user.id,
      p_token: token,
      p_max_users: limits.maxUsers,
    },
  );

  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const row = rpcRows[0] as {
      invite_id: string | null;
      error_message: string | null;
    };
    if (row.error_message) throw new Error(row.error_message);
    if (row.invite_id) {
      revalidatePath("/dashboard/team");
      return;
    }
  }

  // Fallback if RPC not applied yet: re-check seats then insert
  if (rpcError) {
    console.warn(
      "[createInvite] RPC unavailable, using fallback seat check",
      rpcError.message,
    );
    await assertCanInvite(organizationId);
  }

  const { error } = await admin.from("invites").insert({
    organization_id: organizationId,
    email: normalizedEmail,
    role: safeRole,
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
