import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { PipelineClient } from "@/components/pipeline-client";
import { ensureDefaultPipelineStages } from "@/lib/pipeline/seed-default-stages";

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

  // Seed defaults first (no-op when stages already exist), then parallel reads.
  await ensureDefaultPipelineStages(orgId);

  const [stagesRes, contactsRes] = await Promise.all([
    admin
      .from("pipeline_stages")
      .select("id, name, slug, position, is_won, is_lost")
      .eq("organization_id", orgId)
      .order("position", { ascending: true }),
    admin
      .from("contacts")
      .select(
        "id, email, first_name, last_name, source, pipeline_stage_id, updated_at, created_at",
      )
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      // Cap payload — board stays usable; search/filter is client-side on this set.
      .limit(500),
  ]);

  return (
    <PipelineClient
      organizationId={orgId}
      stages={stagesRes.data ?? []}
      contacts={contactsRes.data ?? []}
    />
  );
}
