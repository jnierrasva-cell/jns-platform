import { createAdminClient } from "@/lib/supabase/admin";
import { getValidGoogleAccessToken } from "@/lib/google/token";

type CreateCalendarEventInput = {
  organizationId: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  description?: string | null;
  /** @deprecated use attendeeEmails */
  attendeeEmail?: string | null;
  attendeeEmails?: string[] | null;
  calendarId?: string;
};

function calendarEventsUrl(calendarId: string, eventId?: string) {
  const cal = encodeURIComponent(calendarId || "primary");
  const base = `https://www.googleapis.com/calendar/v3/calendars/${cal}/events`;
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
}

function collectAttendees(input: {
  attendeeEmail?: string | null;
  attendeeEmails?: string[] | null;
}) {
  const set = new Set<string>();
  if (input.attendeeEmail?.includes("@")) {
    set.add(input.attendeeEmail.trim().toLowerCase());
  }
  for (const e of input.attendeeEmails ?? []) {
    if (e?.includes("@")) set.add(e.trim().toLowerCase());
  }
  return Array.from(set).map((email) => ({
    email,
    responseStatus: "needsAction" as const,
  }));
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

    const attendees = collectAttendees(input);

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

    if (attendees.length > 0) {
      body.attendees = attendees;
    }

    const url = new URL(calendarEventsUrl(input.calendarId || "primary"));
    if (attendees.length > 0) {
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
  attendeeEmails?: string[] | null;
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

    const attendees = collectAttendees({
      attendeeEmails: input.attendeeEmails,
    });

    const body: Record<string, unknown> = {
      summary: input.title,
      description: input.description ?? undefined,
      start: { dateTime: start.toISOString(), timeZone: "UTC" },
      end: { dateTime: end.toISOString(), timeZone: "UTC" },
    };
    if (attendees.length > 0) {
      body.attendees = attendees;
    }

    const url = new URL(
      calendarEventsUrl(input.calendarId, input.eventId),
    );
    if (attendees.length > 0) {
      url.searchParams.set("sendUpdates", "all");
    }

    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

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
