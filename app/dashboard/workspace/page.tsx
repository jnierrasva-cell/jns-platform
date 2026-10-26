import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { isOrgManagerRole } from "@/lib/org/roles";
import { WorkspaceClient } from "@/components/workspace-client";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/account-type");

  if (!isOrgManagerRole(active.role)) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <WorkspaceClient
      organizationId={active.organizationId}
      initialName={active.orgName}
      orgKind={active.orgKind}
      initialLogoUrl={active.orgLogoUrl}
      welcome={params.welcome === "1"}
    />
  );
}