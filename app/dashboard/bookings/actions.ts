"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/send";

async function requireOrgMember(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) throw new Error("Not a member of this organization");
  return { supabase, user };
}

export async function createBooking(input: {
  organizationId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  contactId?: string;
  notes?: string;
}) {
  const { supabase } = await requireOrgMember(input.organizationId);

  if (!input.title.trim()) throw new Error("Title is required");
  if (!input.startsAt) throw new Error("Start time is required");

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Invalid start time");
  }

  let endsAt: string | null = null;
  if (input.endsAt) {
    const end = new Date(input.endsAt);
    if (Number.isNaN(end.getTime())) throw new Error("Invalid end time");
    endsAt = end.toISOString();
  }

  const { error } = await supabase.from("bookings").insert({
    organization_id: input.organizationId,
    contact_id: input.contactId || null,
    title: input.title.trim(),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt,
    notes: input.notes?.trim() || null,
    status: "scheduled",
    source: "manual",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
}

export async function updateBookingStatus(
  bookingId: string,
  status: "scheduled" | "completed" | "cancelled" | "no_show",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: booking } = await supabase
    .from("bookings")
    .select("organization_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) throw new Error("Booking not found");
  await requireOrgMember(booking.organization_id);

  const { error } = await supabase
    .from("bookings")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/bookings");
}

/**
 * Sends SMS reminders for scheduled bookings starting within the next 24 hours
 * that have not been reminded yet. Requires:
 * - sms-reminders automation ON
 * - Twilio connected
 * - contact with phone number
 */
export async function sendBookingRemindersNow(organizationId: string) {
  await requireOrgMember(organizationId);

  const admin = createAdminClient();

  const { data: automation } = await admin
    .from("org_automations")
    .select("is_enabled")
    .eq("organization_id", organizationId)
    .eq("service_key", "sms-reminders")
    .maybeSingle();

  if (!automation?.is_enabled) {
    throw new Error("Turn on SMS Reminders in Automation first.");
  }

  const { data: twilio } = await admin
    .from("twilio_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!twilio) {
    throw new Error("Connect Twilio in Integrations first.");
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: dueBookings, error } = await admin
    .from("bookings")
    .select(
      "id, title, starts_at, contact_id, contacts(id, first_name, phone, email)",
    )
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .is("reminder_sms_sent_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in24h.toISOString());

  if (error) throw new Error(error.message);

  let sent = 0;
  let skipped = 0;

  for (const booking of dueBookings ?? []) {
    const contact = Array.isArray(booking.contacts)
      ? booking.contacts[0]
      : booking.contacts;

    const phone = contact?.phone?.trim();
    if (!phone) {
      skipped += 1;
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

      sent += 1;
    } catch {
      skipped += 1;
    }
  }

  revalidatePath("/dashboard/bookings");
  return { sent, skipped };
}