import { createAdminClient } from "@/lib/supabase/admin";
import { upsertContactByEmail } from "@/lib/contacts/upsert";
import type { ActionHandler, ActionResult } from "@/lib/workflows/types";

/**
 * Upsert contact by email within org (reuses lib/contacts/upsert when email present).
 * params: email?, first_name?, last_name?, phone?, source?
 */
export const contactUpsertAction: ActionHandler = {
  key: "contact.upsert",
  label: "Create or update contact",
  async execute(params, ctx): Promise<ActionResult> {
    const email = params.email ? String(params.email).trim().toLowerCase() : "";
    const firstName = params.first_name ? String(params.first_name) : undefined;
    const source = params.source ? String(params.source) : "automation";

    if (email && email.includes("@")) {
      try {
        const id = await upsertContactByEmail({
          organizationId: ctx.organizationId,
          email,
          firstName,
          source,
        });
        const admin = createAdminClient();
        const patch: Record<string, unknown> = {};
        if (params.last_name) patch.last_name = String(params.last_name);
        if (params.phone) patch.phone = String(params.phone);
        if (Object.keys(patch).length > 0) {
          await admin.from("contacts").update(patch).eq("id", id);
        }
        return { ok: true, output: { contact_id: id } };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Contact upsert failed",
          retryable: true,
        };
      }
    }

    if (!firstName && !params.phone && !params.last_name) {
      return {
        ok: false,
        error: "contact.upsert requires email or name/phone",
        retryable: false,
      };
    }

    const admin = createAdminClient();
    const { data: created, error } = await admin
      .from("contacts")
      .insert({
        organization_id: ctx.organizationId,
        email: null,
        first_name: firstName ?? null,
        last_name: params.last_name ? String(params.last_name) : null,
        phone: params.phone ? String(params.phone) : null,
        status: "lead",
        source,
      })
      .select("id")
      .single();

    if (error || !created) {
      return {
        ok: false,
        error: error?.message ?? "Failed to create contact",
        retryable: true,
      };
    }

    return { ok: true, output: { contact_id: created.id, created: true } };
  },
};
