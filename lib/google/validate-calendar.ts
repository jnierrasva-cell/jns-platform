import { getValidGoogleAccessToken } from "@/lib/google/token";
import { fetchWithRetry } from "@/lib/http/retry";

/**
 * Verify the workspace can access the given Google Calendar ID.
 * Accepts "primary" or a full calendar id / email.
 */
export async function validateGoogleCalendarId(input: {
  organizationId: string;
  calendarId: string;
}): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const calendarId = input.calendarId.trim();
  if (!calendarId) {
    return { ok: false, error: "Google Calendar ID is required" };
  }

  try {
    const { accessToken } = await getValidGoogleAccessToken(
      input.organizationId,
    );
    const cal = encodeURIComponent(calendarId);
    const res = await fetchWithRetry(
      `https://www.googleapis.com/calendar/v3/calendars/${cal}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
      { label: "google-calendar-validate", maxAttempts: 3 },
    );

    if (res.status === 404) {
      return {
        ok: false,
        error:
          "Calendar not found. Check the Calendar ID and that the connected Google account can access it.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        error:
          "No access to this calendar with the connected Google account. Share the calendar or use a different ID.",
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Could not verify calendar (${res.status}): ${text.slice(0, 160)}`,
      };
    }

    const json = (await res.json()) as { summary?: string; id?: string };
    return {
      ok: true,
      summary: json.summary || json.id || calendarId,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not verify calendar. Connect Google first.",
    };
  }
}
