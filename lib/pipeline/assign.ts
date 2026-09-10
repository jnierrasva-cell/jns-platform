import { createAdminClient } from "@/lib/supabase/admin";

/** First stage by position for the org (or null if none). */
export async function getFirstPipelineStageId(organizationId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("organization_id", organizationId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Assign contact to a stage.
 * - onlyIfEmpty: only set when pipeline_stage_id is currently null
 * - force: always set (e.g. booking → Booked stage by slug if you extend later)
 */
export async function assignContactPipelineStage(input: {
  contactId: string;
  organizationId: string;
  stageId: string | null;
  onlyIfEmpty?: boolean;
}) {
  if (!input.stageId) return;

  const supabase = createAdminClient();

  if (input.onlyIfEmpty) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("pipeline_stage_id")
      .eq("id", input.contactId)
      .maybeSingle();

    if (contact?.pipeline_stage_id) return;
  }

  await supabase
    .from("contacts")
    .update({
      pipeline_stage_id: input.stageId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId);
}

/** Prefer stage with slug "booked", else first stage. */
export async function getBookedPipelineStageId(organizationId: string) {
  const supabase = createAdminClient();
  const { data: booked } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", "booked")
    .maybeSingle();

  if (booked?.id) return booked.id;
  return getFirstPipelineStageId(organizationId);
}