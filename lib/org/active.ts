import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const activeId = profile?.active_organization_id as string | null;

  // Prefer the org the user opened — never silently replace it
  let selected =
    (activeId &&
      memberships.find((m) => m.organization_id === activeId)) ||
    null;

  if (!selected) {
    selected = memberships[0];
    // Only write when nothing valid was stored
    if (!activeId || activeId !== selected.organization_id) {
      await supabase
        .from("profiles")
        .update({ active_organization_id: selected.organization_id })
        .eq("id", user.id);
    }
  }

  const { data: org } = await supabase
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