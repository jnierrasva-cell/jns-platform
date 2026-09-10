import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PipelineClient } from "@/components/pipeline-client";

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding/setup-business");

  const orgId = membership.organization_id;

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, slug, position, is_won, is_lost")
    .eq("organization_id", orgId)
    .order("position", { ascending: true });

  return (
    <PipelineClient organizationId={orgId} stages={stages ?? []} />
  );
}
