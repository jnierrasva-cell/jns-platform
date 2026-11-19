import { sendSms } from "@/lib/sms/send";
import type { ActionHandler, ActionResult } from "@/lib/workflows/types";

export const smsSendAction: ActionHandler = {
  key: "sms.send",
  label: "Send SMS",
  requiredConnections: ["twilio"],
  async execute(params, ctx): Promise<ActionResult> {
    const to = params.to ? String(params.to).trim() : "";
    const body = params.body ? String(params.body).trim() : "";
    if (!to || !body) {
      return { ok: false, error: "sms.send requires to and body", retryable: false };
    }
    try {
      const result = await sendSms({
        organizationId: ctx.organizationId,
        toPhone: to,
        body,
        contactId: params.contact_id ? String(params.contact_id) : undefined,
      });
      return {
        ok: true,
        output: { sid: result.sid, status: result.status, to },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "SMS send failed",
        retryable: true,
      };
    }
  },
};
