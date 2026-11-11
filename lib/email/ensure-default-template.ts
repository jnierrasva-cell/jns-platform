import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_SUBJECT = "Thanks for reaching out";
const DEFAULT_BODY =
  "Hi {{first_name}},\n\nThanks for your message — we received it and will get back to you shortly.\n\n— {{business_name}}";

/**
 * Ensures the org has template_key gmail_auto_ack (required for auto-reply).
 * Idempotent; does not overwrite an existing template.
 */
export async function ensureDefaultAutoAckTemplate(
  organizationId: string,
  options?: { subject?: string; body?: string },
) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("email_templates")
    .select("template_key")
    .eq("organization_id", organizationId)
    .eq("template_key", "gmail_auto_ack")
    .maybeSingle();

  if (existing) return { created: false as const };

  const { error } = await admin.from("email_templates").insert({
    organization_id: organizationId,
    template_key: "gmail_auto_ack",
    subject: options?.subject?.trim() || DEFAULT_SUBJECT,
    body: options?.body?.trim() || DEFAULT_BODY,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    // Race: another request inserted first
    if (error.code === "23505") return { created: false as const };
    throw new Error(`Could not create default reply template: ${error.message}`);
  }

  return { created: true as const };
}
