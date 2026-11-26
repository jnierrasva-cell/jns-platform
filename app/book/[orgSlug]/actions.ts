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
import { sendBookingConfirmationEmail } from "@/lib/bookings/email-notifications";

const MAX_NOTES_LEN = 2000;
const MAX_NAME_LEN = 120;
const MAX_TITLE_LEN = 160;
const ABUSE_WINDOW_MS = 10 * 60 * 1000;
const ABUSE_MAX_PER_EMAIL = 5;

async function resolvePublicOrg(orgSlug: string): Promise<{ id: string; name: string }> {
  const slug = orgSlug.trim();
  if (!slug || slug.length > 120) {
    throw new Error("Booking page not found");
  }

  const supabase = createAdminClient();

  const bySlug = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (bySlug.data) {
    return { id: bySlug.data.id as string, name: bySlug.data.name as string };
  }

  // allow /book/<organization_uuid> during rollout
  const byId = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", slug)
    .maybeSingle();

  if (byId.data) {
    return { id: byId.data.id as string, name: byId.data.name as string };
  }

  throw new Error("Booking page not found");
}

export async function submitPublicBooking(input: {
  /** Canonical workspace key from the public URL — never trust a free-form org id. */
  orgSlug: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  startsAt: string;
  notes?: string;
}) {
  const org = await resolvePublicOrg(input.orgSlug);
  const organizationId = org.id;
  const supabase = createAdminClient();

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  if (name.length > MAX_NAME_LEN) throw new Error("Name is too long");
  if (!email || !email.includes("@") || email.length > 254) {
    throw new Error("Valid email is required");
  }
  if (!input.startsAt) throw new Error("Please choose a date and time");

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid date/time");

  if (startsAt.getTime() < Date.now() - 60_000) {
    throw new Error("Please choose a future time");
  }

  // Soft upper bound: no bookings more than 1 year out
  if (startsAt.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) {
    throw new Error("Please choose a date within the next year");
  }

  const notes = input.notes?.trim() || null;
  if (notes && notes.length > MAX_NOTES_LEN) {
    throw new Error("Notes are too long");
  }

  const titleRaw = input.title?.trim() || "Appointment";
  if (titleRaw.length > MAX_TITLE_LEN) {
    throw new Error("Title is too long");
  }
  const title = titleRaw;

  // Basic abuse control: limit rapid-fire bookings from the same email per workspace
  const windowStart = new Date(Date.now() - ABUSE_WINDOW_MS).toISOString();
  const { count: recentCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("source", "public_form")
    .gte("created_at", windowStart)
    .filter("contacts.email", "eq", email);

  // Fallback if join filter unsupported: count by contact after upsert path
  // is more reliable below after contact is known.

  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const firstName = name.split(" ")[0] ?? name;
  const lastName = name.split(" ").slice(1).join(" ") || null;

  const contactId = await upsertContactByEmail({
    organizationId,
    email,
    firstName,
    source: "public_booking",
  });

  // Per-contact rate limit (reliable path)
  const { count: contactRecent } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .gte("created_at", windowStart);

  if ((contactRecent ?? 0) >= ABUSE_MAX_PER_EMAIL) {
    throw new Error(
      "Too many booking requests. Please wait a few minutes and try again.",
    );
  }

  // Optional overlap check: reject if this contact already has a scheduled booking starting within 30 min
  const nearStart = new Date(startsAt.getTime() - 30 * 60 * 1000).toISOString();
  const nearEnd = new Date(startsAt.getTime() + 30 * 60 * 1000).toISOString();
  const { count: overlap } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .eq("status", "scheduled")
    .gte("starts_at", nearStart)
    .lte("starts_at", nearEnd);

  if ((overlap ?? 0) > 0) {
    throw new Error(
      "You already have a booking near that time. Choose a different slot.",
    );
  }

  await supabase
    .from("contacts")
    .update({
      phone: input.phone?.trim() || null,
      last_name: lastName,
      status: "booked",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("organization_id", organizationId);

  // Booking → "booked" stage if it exists, else first stage
  const bookedStageId = await getBookedPipelineStageId(organizationId);
  await assignContactPipelineStage({
    contactId,
    organizationId,
    stageId: bookedStageId,
    onlyIfEmpty: false,
  });

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      organization_id: organizationId,
      contact_id: contactId,
      title,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes,
      status: "scheduled",
      source: "public_form",
    })
    .select("id")
    .single();

  if (error || !booking) {
    throw new Error(error?.message ?? "Could not create booking");
  }

  const cal = await createGoogleCalendarEvent({
    organizationId,
    title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    description: notes,
    attendeeEmail: email,
  });

  if (cal.eventId) {
    await saveBookingGoogleEventId(booking.id, cal.eventId);
  }

  try {
    await sendBookingConfirmationEmail({
      organizationId,
      bookingId: booking.id,
      title,
      startsAt: startsAt.toISOString(),
      contactEmail: email,
      contactFirstName: firstName,
      contactId,
    });
  } catch (emailErr) {
    console.error("[submitPublicBooking] confirmation email:", emailErr);
  }

  // silence unused var if join filter path did not apply
  void recentCount;

  return { ok: true as const, bookingId: booking.id };
}
