import { createAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/email/resend";
import type { ActionHandler, ActionResult } from "@/lib/workflows/types";

export const emailSendTemplateAction: ActionHandler = {
  key: "email.send_template",
  label: "Send email",
  requiredConnections: ["jns_mail"],
  async execute(params, ctx): Promise<ActionResult> {
    const to = params.to ? String(params.to).trim() : "";
    const subject = params.subject ? String(params.subject).trim() : "";
    const text = String(params.body ?? params.text ?? "").trim();
    if (!to || !subject || !text) {
      return {
        ok: false,
        error: "email.send_template requires to, subject, and body",
        retryable: false,
      };
    }

    const result = await sendResendEmail({
      to: [to],
      subject,
      text,
    });

    if (!result.ok) {
      return { ok: false, error: result.error, retryable: true };
    }

    try {
      const admin = createAdminClient();
      await admin.from("email_activity").insert({
        organization_id: ctx.organizationId,
        contact_id: params.contact_id ? String(params.contact_id) : null,
        service_key: "workflow",
        direction: "outbound",
        to_email: to,
        subject,
        status: "sent",
      });
    } catch {
      // activity optional
    }

    return { ok: true, output: { to, subject } };
  },
};
