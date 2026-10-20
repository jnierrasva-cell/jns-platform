"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { addOneMonth, normalizePlan, type PlanId } from "@/lib/billing/plans";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const allowed =
    profile?.role === "super_admin" ||
    user.email?.toLowerCase() === "j.nierras.va@gmail.com";

  if (!allowed) throw new Error("Not authorized");

  return { supabase, user };
}

export async function approveUser(userId: string) {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin");
  revalidatePath("/admin");
}

export async function rejectUser(userId: string) {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin");
  revalidatePath("/admin");
}

export async function setUserRole(
  userId: string,
  role: "user" | "super_admin",
) {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin");
  revalidatePath("/admin");
}

export async function removeUser(userId: string) {
  const { user } = await requirePlatformAdmin();

  if (userId === user.id) {
    throw new Error("You cannot remove your own account.");
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  await admin.from("org_members").delete().eq("user_id", userId);

  if (target?.email) {
    await admin.from("invites").delete().eq("email", target.email);
  }

  await admin.from("profiles").delete().eq("id", userId);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin");
  revalidatePath("/admin");
}

export async function generatePasswordResetLink(userId: string): Promise<{
  link: string;
  email: string;
}> {
  await requirePlatformAdmin();

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

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

/**
 * Master admin: assign or clear a workspace subscription (monthly by default).
 */
export async function setOrganizationSubscription(input: {
  organizationId: string;
  plan: PlanId;
  /** If true, set period end to now + 1 month. If false and plan is none, clear. */
  renewOneMonth?: boolean;
  /** Optional ISO date; overrides renewOneMonth when set. */
  periodEndIso?: string | null;
  notes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requirePlatformAdmin();
    const admin = createAdminClient();

    const plan = normalizePlan(input.plan);
    const now = new Date();

    if (plan === "none") {
      const { error } = await admin
        .from("organizations")
        .update({
          plan: "none",
          billing_status: "none",
          billing_provider: "manual",
          plan_period_end: null,
          plan_updated_at: now.toISOString(),
          plan_notes: input.notes?.trim() || null,
        })
        .eq("id", input.organizationId);

      if (error) return { ok: false, error: error.message };
      revalidatePath("/dashboard/admin");
      return { ok: true };
    }

    let periodEnd: string | null = null;
    if (input.periodEndIso) {
      const d = new Date(input.periodEndIso);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid period end date" };
      }
      periodEnd = d.toISOString();
    } else if (input.renewOneMonth !== false) {
      periodEnd = addOneMonth(now).toISOString();
    }

    const { error } = await admin
      .from("organizations")
      .update({
        plan,
        billing_status: "active",
        billing_provider: "manual",
        plan_period_end: periodEnd,
        plan_updated_at: now.toISOString(),
        plan_notes: input.notes?.trim() || null,
      })
      .eq("id", input.organizationId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/admin");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update plan",
    };
  }
}

/** Mark expired orgs (run later via cron or from admin “Refresh expired”). */
export async function expireOverdueSubscriptions(): Promise<{
  ok: true;
  expired: number;
}> {
  await requirePlatformAdmin();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("organizations")
    .update({
      billing_status: "expired",
      plan_updated_at: now,
    })
    .in("billing_status", ["active", "trialing"])
    .lt("plan_period_end", now)
    .not("plan_period_end", "is", null)
    .select("id");

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin");
  return { ok: true, expired: data?.length ?? 0 };
}