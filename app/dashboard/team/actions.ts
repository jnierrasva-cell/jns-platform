"use server";

import { createClient } from "@/lib/supabase/server";
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

  const { error } = await supabase.from("invites").insert({
    organization_id: organizationId,
    email: email.trim().toLowerCase(),
    role,
    invited_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}