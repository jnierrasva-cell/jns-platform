"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  return { supabase, user };
}

export async function approveUser(userId: string) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", userId);
  revalidatePath("/admin");
}

export async function rejectUser(userId: string) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", userId);
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: "client" | "admin") {
  const { supabase } = await requireAdmin();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin");
}

/**
 * Creates a password-recovery link for a member.
 * Does NOT send email — returns the link for the admin to copy/share.
 */
export async function generatePasswordResetLink(userId: string): Promise<{
  link: string;
  email: string;
}> {
  await requireAdmin();

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.email) {
    throw new Error("User email not found");
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://jns-platform.vercel.app";

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
    options: {
      redirectTo: `${origin}/auth/reset-password`,
    },
  });

  if (error) throw new Error(error.message);

  const link =
    data.properties?.action_link ||
    (data as { action_link?: string }).action_link;

  if (!link) throw new Error("Could not generate reset link");

  return { link, email: profile.email };
}