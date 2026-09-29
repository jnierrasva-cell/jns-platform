import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/send";

const DEFAULT_MESSAGE =
  'Hi {{first_name}}, reminder: "{{title}}" is scheduled for {{when}}. Reply if you need to reschedule.';

function applySmsTemplate(
  template: string,
  vars: { first_name: string; title: string; when: string },
) {
  return template
    .replaceAll("{{first_name}}", vars.first_name)
    .replaceAll("{{title}}", vars.title)
    .replaceAll("{{when}}", vars.when);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: enabled } = await admin
    .from("org_automations")
    .select("organization_id")
    .eq("service_key", "sms-reminders")
    .eq("is_enabled", true);

  const orgIds = (enabled ?? []).map((r) => r.organization_id);
  let totalSent = 0;
  let totalSkipped = 0;

  const now = new Date();

  for (const organizationId of orgIds) {
    const { data: twilio } = await admin
      .from("twilio_connections")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!twilio) continue;

    const { data: settingsRow } = await admin
      .from("org_automation_settings")
      .select("settings")
      .eq("organization_id", organizationId)
      .eq("service_key", "sms-reminders")
      .maybeSingle();

    const settings = (settingsRow?.settings ?? {}) as {
      hours_before?: number;
      message?: string;
    };
    const hours = Math.min(72, Math.max(1, Number(settings.hours_before) || 24));
    const messageTemplate = settings.message?.trim() || DEFAULT_MESSAGE;
    const windowEnd = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const { data: dueBookings } = await admin
      .from("bookings")
      .select(
        "id, title, starts_at, contact_id, contacts(id, first_name, phone)",
      )
      .eq("organization_id", organizationId)
      .eq("status", "scheduled")
      .is("reminder_sms_sent_at", null)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", windowEnd.toISOString());

    for (const booking of dueBookings ?? []) {
      const contact = Array.isArray(booking.contacts)
        ? booking.contacts[0]
        : booking.contacts;

      const phone = contact?.phone?.trim();
      if (!phone) {
        totalSkipped += 1;
        continue;
      }

      const firstName = contact?.first_name || "there";
      const when = new Date(booking.starts_at).toLocaleString();
      const body = applySmsTemplate(messageTemplate, {
        first_name: firstName,
        title: booking.title,
        when,
      });

      try {
        await sendSms({
          organizationId,
          toPhone: phone,
          body,
          contactId: contact?.id,
        });

        await admin
          .from("bookings")
          .update({
            reminder_sms_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

        totalSent += 1;
      } catch {
        totalSkipped += 1;
      }
    }
  }

  return NextResponse.json({ sent: totalSent, skipped: totalSkipped });
}
