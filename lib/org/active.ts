import { createClient } from "@/lib/supabase/server";

export type ActiveOrg = {
  organizationId: string;
  role: string;
  orgName: string;
};

/**
 * Resolves the user's active organization from profiles.active_organization_id.
 * If missing/invalid, picks the first membership and saves it.
 */
export async function getActiveOrg(): Promise<ActiveOrg | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("org_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id);

  if (!memberships?.length) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  let selected = memberships.find(
    (m) => m.organization_id === profile?.active_organization_id,
  );

  if (!selected) {
    selected = memberships[0];
    await supabase
      .from("profiles")
      .update({ active_organization_id: selected.organization_id })
      .eq("id", user.id);
  }

  const org = Array.isArray(selected.organizations)
    ? selected.organizations[0]
    : selected.organizations;

  return {
    organizationId: selected.organization_id,
    role: selected.role as string,
    orgName: (org as { name?: string } | null)?.name ?? "Workspace",
  };
}