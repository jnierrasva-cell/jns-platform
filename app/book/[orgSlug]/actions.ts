"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertContactByEmail } from "@/lib/contacts/upsert";
import {
  createGoogleCalendarEvent,
  saveBookingGoogleEventId,
} from "@/lib/google/calendar";

export async function submitPublicBooking(input: {
  organizationId: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  startsAt: string; // ISO from browser local
  notes?: string;
}) {
  const supabase = createAdminClient();

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (!email || !email.includes("@")) throw new Error("Valid email is required");
  if (!input.startsAt) throw new Error("Please choose a date and time");

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid date/time");

  // Block past bookings
  if (startsAt.getTime() < Date.now() - 60_000) {
    throw new Error("Please choose a future time");
  }

  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // default 1h

  const firstName = name.split(" ")[0] ?? name;
  const lastName = name.split(" ").slice(1).join(" ") || null;

  const contactId = await upsertContactByEmail({
    organizationId: input.organizationId,
    email,
    firstName,
    source: "public_booking",
  });

  // Store phone / last name if provided
  await supabase
    .from("contacts")
    .update({
      phone: input.phone?.trim() || null,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  const title = input.title?.trim() || "Appointment";

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      organization_id: input.organizationId,
      contact_id: contactId,
      title,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: input.notes?.trim() || null,
      status: "scheduled",
      source: "public_form",
    })
    .select("id")
    .single();

  if (error || !booking) {
    throw new Error(error?.message ?? "Could not create booking");
  }

  // Calendar + email invite (best effort)
  const cal = await createGoogleCalendarEvent({
    organizationId: input.organizationId,
    title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    description: input.notes?.trim() || null,
    attendeeEmail: email,
  });

  if (cal.eventId) {
    await saveBookingGoogleEventId(booking.id, cal.eventId);
  }

  return { ok: true as const, bookingId: booking.id };
}