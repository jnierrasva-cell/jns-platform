import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { PipelineClient } from "@/components/pipeline-client";

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;
  const admin = createAdminClient();

  const { data: stages } = await admin
    .from("pipeline_stages")
    .select("id, name, slug, position, is_won, is_lost")
    .eq("organization_id", orgId)
    .order("position", { ascending: true });

  const { data: contacts } = await admin
    .from("contacts")
    .select("id, first_name, last_name, email, status, pipeline_stage_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <PipelineClient
      organizationId={orgId}
      stages={stages ?? []}
      contacts={contacts ?? []}
    />
  );
}