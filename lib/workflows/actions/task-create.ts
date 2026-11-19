import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionContext, ActionHandler, ActionResult } from "@/lib/workflows/types";

/**
 * Create a task in the org (Phase 0 — real side effect).
 * params: title (required), description?, priority?, due_date?, contact_id?, assignee_user_id?
 */
export const taskCreateAction: ActionHandler = {
  key: "task.create",
  label: "Create task",
  async execute(params, ctx): Promise<ActionResult> {
    const title = String(params.title ?? "").trim();
    if (!title) {
      return { ok: false, error: "task.create requires title", retryable: false };
    }

    const priority = ["low", "medium", "high"].includes(String(params.priority))
      ? String(params.priority)
      : "medium";

    const admin = createAdminClient();
    const { data: task, error } = await admin
      .from("tasks")
      .insert({
        organization_id: ctx.organizationId,
        title,
        description: params.description ? String(params.description) : null,
        priority,
        due_date: params.due_date ? String(params.due_date) : null,
        contact_id: params.contact_id ? String(params.contact_id) : null,
        status: "not_started",
      })
      .select("id")
      .single();

    if (error || !task) {
      return { ok: false, error: error?.message ?? "Failed to create task", retryable: true };
    }

    const assignee = params.assignee_user_id
      ? String(params.assignee_user_id)
      : null;
    if (assignee) {
      await admin.from("task_assignees").insert({
        task_id: task.id,
        user_id: assignee,
        organization_id: ctx.organizationId,
      });
    }

    return { ok: true, output: { task_id: task.id } };
  },
};
