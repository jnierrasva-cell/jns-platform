import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { OrgsClient } from "@/components/orgs-client";

export default async function OrgsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveOrg();

  const { data: memberships } = await supabase
    .from("org_members")
    .select("organization_id, role, organizations(id, name)")
    .eq("user_id", user.id);

  const orgs = (memberships ?? []).map((m) => {
    const org = Array.isArray(m.organizations)
      ? m.organizations[0]
      : m.organizations;
    return {
      id: m.organization_id as string,
      name: (org as { name?: string } | null)?.name ?? "Workspace",
      role: m.role as string,
      isActive: m.organization_id === active?.organizationId,
    };
  });

  return <OrgsClient orgs={orgs} />;
}