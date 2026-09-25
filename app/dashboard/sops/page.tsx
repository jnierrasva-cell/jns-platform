import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { SopsClient } from "@/components/sops-client";

export default async function SopsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/dashboard/orgs");

  const canManage = active.role === "ceo" || active.role === "admin";

  const { data: sops } = await supabase
    .from("org_sops")
    .select(
      "id, title, description, file_name, file_type, file_size, created_at, uploaded_by",
    )
    .eq("organization_id", active.organizationId)
    .order("created_at", { ascending: false });

  return (
    <SopsClient
      orgName={active.orgName}
      canManage={canManage}
      sops={sops ?? []}
    />
  );
}