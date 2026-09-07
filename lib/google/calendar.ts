import { createAdminClient } from "@/lib/supabase/admin";
import { getValidGoogleAccessToken } from "@/lib/google/token";

type CreateCalendarEventInput = {
  organizationId: string;
  title: string;
  startsAt: string; // ISO
  endsAt?: string | null;
  description?: string | null;
  attendeeEmail?: string | null;
};

/**
 * Creates a Google Calendar event on the primary calendar.
 * Returns Google event id, or null if skipped/failed softly.
 */
export async function createGoogleCalendarEvent(
  input: CreateCalendarEventInput,
) {
  try {
    const { accessToken } = await getValidGoogleAccessToken(
      input.organizationId,
    );

    const start = new Date(input.startsAt);
    if (Number.isNaN(start.getTime())) {
      throw new Error("Invalid start time for calendar event");
    }

    const end = input.endsAt
      ? new Date(input.endsAt)
      : new Date(start.getTime() + 60 * 60 * 1000);

    if (Number.isNaN(end.getTime())) {
      throw new Error("Invalid end time for calendar event");
    }

    const body: Record<string, unknown> = {
      summary: input.title,
      description: input.description ?? undefined,
      start: {
        dateTime: start.toISOString(),
      },
      end: {
        dateTime: end.toISOString(),
      },
    };

    if (input.attendeeEmail) {
      body.attendees = [{ email: input.attendeeEmail }];
    }

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[google-calendar] create failed", err);
      return null;
    }

    const event = await res.json();
    return (event.id as string) ?? null;
  } catch (err) {
    console.error("[google-calendar] error", err);
    return null;
  }
}

export async function saveBookingGoogleEventId(
  bookingId: string,
  googleEventId: string,
) {
  const supabase = createAdminClient();
  await supabase
    .from("bookings")
    .update({
      google_event_id: googleEventId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
}