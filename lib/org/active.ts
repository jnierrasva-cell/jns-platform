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

  // Read-only cookie access is allowed in Server Components
  const jar = await cookies();
  const cookieOrgId = jar.get("jns_active_org")?.value ?? null;

  let profileActiveId: string | null = null;
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("active_organization_id")
      .eq("id", user.id)
      .maybeSingle();
    profileActiveId = (profile?.active_organization_id as string | null) ?? null;
  } catch {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", user.id)
      .maybeSingle();
    profileActiveId = (profile?.active_organization_id as string | null) ?? null;
  }

  const preferredId = cookieOrgId || profileActiveId;

  let selected =
    (preferredId &&
      memberships.find((m) => m.organization_id === preferredId)) ||
    null;

  if (!selected) {
    selected = memberships[0];
  }

  // Align profile only — do NOT cookies().set() here (crashes Server Components)
  if (profileActiveId !== selected.organization_id) {
    try {
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ active_organization_id: selected.organization_id })
        .eq("id", user.id);
    } catch {
      await supabase
        .from("profiles")
        .update({ active_organization_id: selected.organization_id })
        .eq("id", user.id);
    }
  }

  let orgName = "Workspace";
  try {
    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", selected.organization_id)
      .maybeSingle();
    orgName = org?.name ?? "Workspace";
  } catch {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", selected.organization_id)
      .maybeSingle();
    orgName = org?.name ?? "Workspace";
  }

  return {
    organizationId: selected.organization_id,
    role: selected.role as string,
    orgName,
  };
}
