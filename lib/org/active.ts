import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActiveOrg = {
  organizationId: string;
  role: string;
  orgName: string;
};

export async function getActiveOrg(): Promise<ActiveOrg | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (!memberships?.length) return null;

  const jar = await cookies();
  const cookieOrgId = jar.get("jns_active_org")?.value ?? null;

  // Prefer admin read so RLS/triggers can't hide the value
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const preferredId =
    cookieOrgId || (profile?.active_organization_id as string | null);

  let selected =
    (preferredId &&
      memberships.find((m) => m.organization_id === preferredId)) ||
    null;

  if (!selected) {
    selected = memberships[0];
  }

  // Keep cookie + profile aligned to what we actually use
  if (preferredId !== selected.organization_id) {
    jar.set("jns_active_org", selected.organization_id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
    await admin
      .from("profiles")
      .update({ active_organization_id: selected.organization_id })
      .eq("id", user.id);
  }

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", selected.organization_id)
    .maybeSingle();

  return {
    organizationId: selected.organization_id,
    role: selected.role as string,
    orgName: org?.name ?? "Workspace",
  };
}