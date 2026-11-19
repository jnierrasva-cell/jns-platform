import { createAdminClient } from "@/lib/supabase/admin";
import { assignContactPipelineStage } from "@/lib/pipeline/assign";
import type { ActionHandler, ActionResult } from "@/lib/workflows/types";

export const pipelineSetStageAction: ActionHandler = {
  key: "pipeline.set_stage",
  label: "Set pipeline stage",
  async execute(params, ctx): Promise<ActionResult> {
    const contactId = params.contact_id ? String(params.contact_id) : "";
    if (!contactId) {
      return {
        ok: false,
        error: "pipeline.set_stage requires contact_id",
        retryable: false,
      };
    }

    const admin = createAdminClient();
    let stageId = params.stage_id ? String(params.stage_id) : null;
    const slug = params.stage_slug ? String(params.stage_slug) : null;

    if (!stageId && slug) {
      const { data } = await admin
        .from("pipeline_stages")
        .select("id")
        .eq("organization_id", ctx.organizationId)
        .eq("slug", slug)
        .maybeSingle();
      stageId = (data?.id as string) ?? null;
    }

    if (!stageId) {
      return {
        ok: false,
        error: "pipeline.set_stage requires stage_id or stage_slug",
        retryable: false,
      };
    }

    await assignContactPipelineStage({
      contactId,
      organizationId: ctx.organizationId,
      stageId,
      onlyIfEmpty: false,
    });

    return { ok: true, output: { contact_id: contactId, stage_id: stageId } };
  },
};
