"use server";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isOrgManagerRole } from "@/lib/org/roles";

type Authed = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
};

type OrgAuthed = Authed & {
  role: string;
};

export async function requireAuthUser(): Promise<Authed> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function requireOrgMember(
  organizationId: string,
): Promise<OrgAuthed> {
  const { supabase, user } = await requireAuthUser();

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) {
    throw new Error("Not a member of this organization");
  }

  return { supabase, user, role: membership.role as string };
}

export async function requireOrgManager(
  organizationId: string,
): Promise<OrgAuthed> {
  const ctx = await requireOrgMember(organizationId);
  if (!isOrgManagerRole(ctx.role)) {
    throw new Error("Not authorized — owners and admins only");
  }
  return ctx;
}

export async function requirePlatformAdmin(): Promise<Authed> {
  const { supabase, user } = await requireAuthUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email?.toLowerCase() ?? "";
  const ok =
    profile?.role === "super_admin" || email === "j.nierras.va@gmail.com";

  if (!ok) throw new Error("Not authorized");
  return { supabase, user };
}