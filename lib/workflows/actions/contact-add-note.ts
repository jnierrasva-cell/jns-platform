import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionHandler, ActionResult } from "@/lib/workflows/types";

export const contactAddNoteAction: ActionHandler = {
  key: "contact.add_note",
  label: "Add contact note",
  async execute(params, ctx): Promise<ActionResult> {
    const contactId = params.contact_id ? String(params.contact_id) : "";
    const body = params.body ? String(params.body).trim() : "";
    if (!contactId || !body) {
      return {
        ok: false,
        error: "contact.add_note requires contact_id and body",
        retryable: false,
      };
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("contact_notes")
      .insert({
        organization_id: ctx.organizationId,
        contact_id: contactId,
        body,
        created_by: null,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message, retryable: true };
    }
    return { ok: true, output: { note_id: data?.id } };
  },
};
