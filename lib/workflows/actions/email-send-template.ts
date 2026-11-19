import type { ActionHandler, ActionResult } from "@/lib/workflows/types";

/**
 * Send templated email — Phase 0 stub (logs only).
 * Phase 1 wires Google / JNS mail + Templates.
 */
export const emailSendTemplateAction: ActionHandler = {
  key: "email.send_template",
  label: "Send email from template",
  requiredConnections: ["jns_mail"],
  async execute(params, _ctx): Promise<ActionResult> {
    const to = params.to ? String(params.to) : null;
    const templateKey = params.template_key ? String(params.template_key) : null;
    if (!to) {
      return { ok: false, error: "email.send_template requires to", retryable: false };
    }
    return {
      ok: true,
      output: {
        stub: true,
        to,
        template_key: templateKey,
        message: "Phase 0 stub — email not sent",
      },
    };
  },
};
