"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  startsAt: string; // ISO string from datetime-local
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