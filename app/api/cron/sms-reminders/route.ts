import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/send";

/**
 * Runs on a schedule (Vercel Cron).
 * For each org with sms-reminders ON + Twilio connected:
 * send reminders for scheduled bookings in the next 24h without reminder_sms_sent_at.
 */
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
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  for (const organizationId of orgIds) {
    const { data: twilio } = await admin
      .from("twilio_connections")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!twilio) continue;

    const { data: dueBookings } = await admin
      .from("bookings")
      .select(
        "id, title, starts_at, contact_id, contacts(id, first_name, phone)",
      )
      .eq("organization_id", organizationId)
      .eq("status", "scheduled")
      .is("reminder_sms_sent_at", null)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in24h.toISOString());

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
      const body = `Hi ${firstName}, reminder: "${booking.title}" is scheduled for ${when}. Reply if you need to reschedule.`;

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

  return NextResponse.json({
    ok: true,
    sent: totalSent,
    skipped: totalSkipped,
    orgs: orgIds.length,
  });
}