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

  // Load name separately so a failed embed doesn't kill the whole active org
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