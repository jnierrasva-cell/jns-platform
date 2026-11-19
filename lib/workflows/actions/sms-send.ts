import type { ActionHandler, ActionResult } from "@/lib/workflows/types";

/**
 * Send SMS via Twilio — Phase 0 stub (logs only).
 */
export const smsSendAction: ActionHandler = {
  key: "sms.send",
  label: "Send SMS",
  requiredConnections: ["twilio"],
  async execute(params, _ctx): Promise<ActionResult> {
    const to = params.to ? String(params.to) : null;
    const body = params.body ? String(params.body) : null;
    if (!to || !body) {
      return {
        ok: false,
        error: "sms.send requires to and body",
        retryable: false,
      };
    }
    return {
      ok: true,
      output: {
        stub: true,
        to,
        body,
        message: "Phase 0 stub — SMS not sent",
      },
    };
  },
};
