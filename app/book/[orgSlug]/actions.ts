"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertContactByEmail } from "@/lib/contacts/upsert";
import {
  createGoogleCalendarEvent,
  saveBookingGoogleEventId,
} from "@/lib/google/calendar";
import {
  assignContactPipelineStage,
  getBookedPipelineStageId,
} from "@/lib/pipeline/assign";

export async function submitPublicBooking(input: {
  organizationId: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  startsAt: string;
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

  if (startsAt.getTime() < Date.now() - 60_000) {
    throw new Error("Please choose a future time");
  }

  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const firstName = name.split(" ")[0] ?? name;
  const lastName = name.split(" ").slice(1).join(" ") || null;

  const contactId = await upsertContactByEmail({
    organizationId: input.organizationId,
    email,
    firstName,
    source: "public_booking",
  });

  await supabase
    .from("contacts")
    .update({
      phone: input.phone?.trim() || null,
      last_name: lastName,
      status: "booked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  // Booking → "booked" stage if it exists, else first stage
  const bookedStageId = await getBookedPipelineStageId(input.organizationId);
  await assignContactPipelineStage({
    contactId,
    organizationId: input.organizationId,
    stageId: bookedStageId,
    onlyIfEmpty: false,
  });

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