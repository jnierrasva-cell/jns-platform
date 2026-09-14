import { createAdminClient } from "@/lib/supabase/admin";
import { getValidGoogleAccessToken } from "@/lib/google/token";

type CreateCalendarEventInput = {
  organizationId: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  description?: string | null;
  attendeeEmail?: string | null;
  /** Defaults to "primary" */
  calendarId?: string;
};

function calendarEventsUrl(calendarId: string, eventId?: string) {
  const cal = encodeURIComponent(calendarId || "primary");
  const base = `https://www.googleapis.com/calendar/v3/calendars/${cal}/events`;
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
}

export async function createGoogleCalendarEvent(
  input: CreateCalendarEventInput,
): Promise<{ eventId: string | null; error?: string }> {
  try {
    const { accessToken } = await getValidGoogleAccessToken(
      input.organizationId,
    );

    const start = new Date(input.startsAt);
    if (Number.isNaN(start.getTime())) {
      return { eventId: null, error: "Invalid start time" };
    }

    const end = input.endsAt
      ? new Date(input.endsAt)
      : new Date(start.getTime() + 60 * 60 * 1000);

    if (Number.isNaN(end.getTime())) {
      return { eventId: null, error: "Invalid end time" };
    }

    const body: Record<string, unknown> = {
      summary: input.title,
      description: input.description ?? undefined,
      start: {
        dateTime: start.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: "UTC",
      },
    };

    if (input.attendeeEmail) {
      body.attendees = [
        {
          email: input.attendeeEmail,
          responseStatus: "needsAction",
        },
      ];
    }

    const url = new URL(
      calendarEventsUrl(input.calendarId || "primary"),
    );
    if (input.attendeeEmail) {
      url.searchParams.set("sendUpdates", "all");
    }

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("[google-calendar] create failed", res.status, text);
      return {
        eventId: null,
        error: `Google Calendar ${res.status}: ${text.slice(0, 300)}`,
      };
    }

    const event = JSON.parse(text);
    return { eventId: (event.id as string) ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[google-calendar] error", message);
    return { eventId: null, error: message };
  }
}

export async function updateGoogleCalendarEvent(input: {
  organizationId: string;
  calendarId: string;
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  description?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { accessToken } = await getValidGoogleAccessToken(
      input.organizationId,
    );

    const start = new Date(input.startsAt);
    const end = new Date(input.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { ok: false, error: "Invalid time" };
    }

    const res = await fetch(
      calendarEventsUrl(input.calendarId, input.eventId),
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: input.title,
          description: input.description ?? undefined,
          start: { dateTime: start.toISOString(), timeZone: "UTC" },
          end: { dateTime: end.toISOString(), timeZone: "UTC" },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Google ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export async function deleteGoogleCalendarEvent(input: {
  organizationId: string;
  calendarId: string;
  eventId: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { accessToken } = await getValidGoogleAccessToken(
      input.organizationId,
    );

    const res = await fetch(
      calendarEventsUrl(input.calendarId, input.eventId),
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    // 410 Gone / 404 = already deleted
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const text = await res.text();
      return { ok: false, error: `Google ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
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