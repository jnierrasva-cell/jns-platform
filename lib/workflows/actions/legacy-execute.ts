import type { ActionHandler, ActionResult } from "@/lib/workflows/types";
import { sendSms } from "@/lib/sms/send";
import { sendBookingReminderEmail } from "@/lib/bookings/email-notifications";

export const legacyExecuteAction: ActionHandler = {
  key: "legacy.execute",
  label: "Legacy system action",
  async execute(params, ctx): Promise<ActionResult> {
    const serviceKey = params.service_key ? String(params.service_key) : "";
    if (!serviceKey) {
      return {
        ok: false,
        error: "legacy.execute requires service_key",
        retryable: false,
      };
    }

    if (serviceKey === "email-auto-ack") {
      return {
        ok: true,
        output: {
          note: "email-auto-ack runs via Gmail push + sendAutoAck, not this step",
          service_key: serviceKey,
        },
      };
    }

    if (serviceKey === "sms-reminders") {
      const phone = params.to || params.phone || ctx.payload.phone;
      const body = params.body || ctx.payload.body;
      if (!phone || !body) {
        return {
          ok: true,
          output: {
            skipped: true,
            reason: "sms requires to/phone and body in params or payload",
          },
        };
      }
      try {
        const result = await sendSms({
          organizationId: ctx.organizationId,
          toPhone: String(phone),
          body: String(body),
          contactId: params.contact_id
            ? String(params.contact_id)
            : ctx.payload.contact_id
              ? String(ctx.payload.contact_id)
              : undefined,
        });
        return { ok: true, output: { sid: result.sid, status: result.status } };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "SMS failed",
          retryable: true,
        };
      }
    }

    if (serviceKey === "booking-email-reminders") {
      const bookingId =
        params.booking_id || ctx.payload.booking_id || ctx.payload.entity_id;
      const email =
        params.to || ctx.payload.contact_email || ctx.payload.email;
      const title = params.title || ctx.payload.title || "Booking";
      const startsAt =
        params.starts_at || ctx.payload.starts_at || new Date().toISOString();
      if (!bookingId || !email) {
        return {
          ok: true,
          output: {
            skipped: true,
            reason: "booking email requires booking_id and email",
          },
        };
      }
      const result = await sendBookingReminderEmail({
        organizationId: ctx.organizationId,
        bookingId: String(bookingId),
        title: String(title),
        startsAt: String(startsAt),
        contactEmail: String(email),
        contactFirstName:
          (ctx.payload.contact_first_name as string) ||
          (ctx.payload.first_name as string) ||
          null,
        contactId: ctx.payload.contact_id
          ? String(ctx.payload.contact_id)
          : null,
      });
      return {
        ok: result.sent,
        output: result as unknown as Record<string, unknown>,
        error: result.sent ? undefined : result.reason,
        retryable: !result.sent,
      };
    }

    return {
      ok: false,
      error: `Unknown legacy service_key: ${serviceKey}`,
      retryable: false,
    };
  },
};
