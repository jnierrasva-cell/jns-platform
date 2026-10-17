import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { isOrgManagerRole } from "@/lib/org/roles";
import { SopsClient } from "@/components/sops-client";

export default async function SopsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/dashboard/orgs");

  const canManage = isOrgManagerRole(active.role);
  const admin = createAdminClient();

  let query = admin
    .from("org_sops")
    .select(
      "id, title, description, file_name, file_type, file_size, created_at, updated_at, uploaded_by, visibility, version",
    )
    .eq("organization_id", active.organizationId)
    .order("updated_at", { ascending: false });

  // Non-managers: only SOPs shared with the whole team
  if (!canManage) {
    query = query.eq("visibility", "all_members");
  }

  const { data: sops } = await query;

  return (
    <SopsClient
      organizationId={active.organizationId}
      orgName={active.orgName}
      canManage={canManage}
      sops={sops ?? []}
    />
  );
}