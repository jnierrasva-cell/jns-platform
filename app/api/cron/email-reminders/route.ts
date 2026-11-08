import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingReminderEmail } from "@/lib/bookings/email-notifications";

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
    .eq("service_key", "booking-email-reminders")
    .eq("is_enabled", true);

  const orgIds = (enabled ?? []).map((r) => r.organization_id as string);
  let totalSent = 0;
  let totalSkipped = 0;

  const now = new Date();

  for (const organizationId of orgIds) {
    const { data: settingsRow } = await admin
      .from("org_automation_settings")
      .select("settings")
      .eq("organization_id", organizationId)
      .eq("service_key", "booking-email-reminders")
      .maybeSingle();

    const settings = (settingsRow?.settings ?? {}) as {
      hours_before?: number;
      send_reminder?: boolean;
    };

    if (settings.send_reminder === false) continue;

    const hours = Math.min(72, Math.max(1, Number(settings.hours_before) || 24));
    const windowEnd = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();

    const { data: dueBookings } = await admin
      .from("bookings")
      .select(
        "id, title, starts_at, contact_id, contacts(id, first_name, email)",
      )
      .eq("organization_id", organizationId)
      .eq("status", "scheduled")
      .is("reminder_email_sent_at", null)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", windowEnd.toISOString());

    for (const booking of dueBookings ?? []) {
      const contact = Array.isArray(booking.contacts)
        ? booking.contacts[0]
        : booking.contacts;

      const email = contact?.email?.trim();
      if (!email) {
        totalSkipped += 1;
        continue;
      }

      const result = await sendBookingReminderEmail({
        organizationId,
        bookingId: booking.id as string,
        title: booking.title as string,
        startsAt: booking.starts_at as string,
        contactEmail: email,
        contactFirstName: contact?.first_name ?? null,
        contactId: contact?.id ?? null,
        businessName: org?.name ?? undefined,
      });

      if (result.sent) totalSent += 1;
      else totalSkipped += 1;
    }
  }

  return NextResponse.json({ sent: totalSent, skipped: totalSkipped });
}
