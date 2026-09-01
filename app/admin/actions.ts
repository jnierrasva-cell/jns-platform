"use server";

import { createClient } from "@/lib/supabase/server";
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

  return supabase;
}

export async function approveUser(userId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", userId);
  revalidatePath("/admin");
}

export async function rejectUser(userId: string) {
  const supabase = await requireAdmin();
  await supabase
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", userId);
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: "client" | "admin") {
  const supabase = await requireAdmin();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin");
}