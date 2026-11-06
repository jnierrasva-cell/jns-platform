import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchArketaClasses,
  resolveInstructorEmails,
} from "@/lib/arketa/client";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  findGoogleEventByArketaClassId,
  deleteJnsArketaEventsInWindow,
} from "@/lib/google/calendar";
import { decryptSecret } from "@/lib/crypto/secrets";

export type SyncLocationResult = {
  locationId: string;
  label: string;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  error?: string;
};

const SYNC_DAYS_BACK = 1;
const SYNC_DAYS_FORWARD = 21;

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

function classEndIso(startIso: string, durationMinutes: number) {
  const start = new Date(startIso);
  const end = new Date(
    start.getTime() + (durationMinutes || 60) * 60 * 1000,
  );
  return end.toISOString();
}

function buildNameToEmailMap(raw: unknown): Record<string, string> {
  const nameToEmail: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return nameToEmail;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.includes("@")) {
      nameToEmail[k.trim().toLowerCase()] = v.trim().toLowerCase();
    }
  }
  return nameToEmail;
}

function sameInstant(a: string | null | undefined, b: string) {
  if (!a) return false;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Number.isFinite(ta) && Number.isFinite(tb) && ta === tb;
}

export async function syncArketaLocationById(
  arketaLocationId: string,
): Promise<SyncLocationResult> {
  const admin = createAdminClient();

  const { data: loc, error } = await admin
    .from("arketa_locations")
    .select(
      "id, organization_id, label, partner_id, api_key, google_calendar_id, instructor_email_map, timezone, consecutive_failures",
    )
    .eq("id", arketaLocationId)
    .single();

  if (error || !loc) {
    return {
      locationId: arketaLocationId,
      label: "?",
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      error: error?.message || "Location not found",
    };
  }

  const base: SyncLocationResult = {
    locationId: loc.id,
    label: loc.label,
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
  };

  const timeZone =
    (typeof loc.timezone === "string" && loc.timezone.trim()) ||
    "America/Los_Angeles";

  if (!loc.google_calendar_id?.trim()) {
    await admin
      .from("arketa_locations")
      .update({
        last_sync_status: "error",
        last_sync_error: "Google Calendar ID missing",
        consecutive_failures: (loc.consecutive_failures ?? 0) + 1,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", loc.id);

    return { ...base, error: "Google Calendar ID missing" };
  }

  const calendarId = loc.google_calendar_id.trim();
  const nameToEmail = buildNameToEmailMap(loc.instructor_email_map);

  let apiKeyPlain: string;
  try {
    apiKeyPlain = decryptSecret(loc.api_key) ?? "";
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to decrypt Arketa API key";
    await admin
      .from("arketa_locations")
      .update({
        last_sync_status: "error",
        last_sync_error: msg.slice(0, 500),
        consecutive_failures: (loc.consecutive_failures ?? 0) + 1,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", loc.id);
    return { ...base, error: msg };
  }

  if (!apiKeyPlain) {
    await admin
      .from("arketa_locations")
      .update({
        last_sync_status: "error",
        last_sync_error: "Arketa API key missing",
        consecutive_failures: (loc.consecutive_failures ?? 0) + 1,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", loc.id);
    return { ...base, error: "Arketa API key missing" };
  }

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - SYNC_DAYS_BACK * 24 * 60 * 60 * 1000,
  );
  const windowEnd = new Date(
    now.getTime() + SYNC_DAYS_FORWARD * 24 * 60 * 60 * 1000,
  );

  let firstGoogleError: string | null = null;
  let accessToken: string | undefined;

  try {
    try {
      const { getValidGoogleAccessToken } = await import(
        "@/lib/google/token"
      );
      const tokenResult = await getValidGoogleAccessToken(loc.organization_id);
      accessToken = tokenResult.accessToken;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Google is not connected for this workspace";
      await admin
        .from("arketa_locations")
        .update({
          last_sync_status: "error",
          last_sync_error: msg.slice(0, 500),
          consecutive_failures: (loc.consecutive_failures ?? 0) + 1,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", loc.id);
      return { ...base, error: msg };
    }

    const classes = await fetchArketaClasses({
      partnerId: loc.partner_id,
      apiKey: apiKeyPlain,
      startDate: toDateParam(windowStart),
      endDate: toDateParam(windowEnd),
    });

    const { data: existingMaps } = await admin
      .from("arketa_class_events")
      .select("id, arketa_class_id, google_event_id, last_start_at, last_title")
      .eq("arketa_location_id", loc.id);

    const mapByClassId = new Map(
      (existingMaps ?? []).map((m) => [m.arketa_class_id, m]),
    );

    const seen = new Set<string>();

    for (const cls of classes) {
      if (!cls?.id) {
        base.skipped += 1;
        continue;
      }
      seen.add(cls.id);

      const inactive = Boolean(cls.canceled || cls.deleted);
      let mapped = mapByClassId.get(cls.id) ?? null;

      // Recover map if event exists on Google but row was lost
      if (!mapped) {
        const existingId = await findGoogleEventByArketaClassId({
          organizationId: loc.organization_id,
          calendarId,
          arketaClassId: cls.id,
          accessToken,
        });
        if (existingId) {
          const { data: inserted } = await admin
            .from("arketa_class_events")
            .insert({
              organization_id: loc.organization_id,
              arketa_location_id: loc.id,
              arketa_class_id: cls.id,
              google_event_id: existingId,
              google_calendar_id: calendarId,
              last_start_at: cls.start_time ?? null,
              last_title: cls.name ?? null,
              updated_at: new Date().toISOString(),
            })
            .select("id, arketa_class_id, google_event_id, last_start_at, last_title")
            .maybeSingle();
          if (inserted) {
            mapped = inserted;
            mapByClassId.set(cls.id, inserted);
          }
        }
      }

      if (inactive) {
        if (mapped) {
          await deleteGoogleCalendarEvent({
            organizationId: loc.organization_id,
            calendarId,
            eventId: mapped.google_event_id,
            accessToken,
          });
          await admin
            .from("arketa_class_events")
            .delete()
            .eq("id", mapped.id);
          base.deleted += 1;
        } else {
          base.skipped += 1;
        }
        continue;
      }

      if (!cls.start_time) {
        base.skipped += 1;
        continue;
      }

      const title = cls.name || "Class";
      const startsAt = cls.start_time;
      const endsAt = classEndIso(cls.start_time, cls.duration);
      const guestEmails = resolveInstructorEmails(cls, nameToEmail);

      const description = [
        cls.instructor_name ? `Instructor: ${cls.instructor_name}` : null,
        guestEmails.length ? `Notified: ${guestEmails.join(", ")}` : null,
        "Synced from Arketa via JNS",
        cls.description?.slice(0, 500) || null,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (mapped) {
        // Skip no-op updates when title + start are unchanged
        if (
          mapped.last_title === title &&
          sameInstant(mapped.last_start_at, startsAt)
        ) {
          base.skipped += 1;
          continue;
        }

        const upd = await updateGoogleCalendarEvent({
          organizationId: loc.organization_id,
          calendarId,
          eventId: mapped.google_event_id,
          title,
          startsAt,
          endsAt,
          description,
          attendeeEmails: guestEmails,
          arketaClassId: cls.id,
          timeZone,
          accessToken,
        });
        if (!upd.ok) {
          if (!firstGoogleError && upd.error) firstGoogleError = upd.error;
          base.skipped += 1;
          continue;
        }
        await admin
          .from("arketa_class_events")
          .update({
            last_start_at: startsAt,
            last_title: title,
            google_calendar_id: calendarId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mapped.id);
        base.updated += 1;
      } else {
        const created = await createGoogleCalendarEvent({
          organizationId: loc.organization_id,
          calendarId,
          title,
          startsAt,
          endsAt,
          description,
          attendeeEmails: guestEmails,
          arketaClassId: cls.id,
          timeZone,
          accessToken,
        });
        if (!created.eventId) {
          if (!firstGoogleError && created.error) {
            firstGoogleError = created.error;
          }
          base.skipped += 1;
          continue;
        }
        await admin.from("arketa_class_events").insert({
          organization_id: loc.organization_id,
          arketa_location_id: loc.id,
          arketa_class_id: cls.id,
          google_event_id: created.eventId,
          google_calendar_id: calendarId,
          last_start_at: startsAt,
          last_title: title,
          updated_at: new Date().toISOString(),
        });
        base.created += 1;
      }
    }

    // Delete mapped events that are no longer in the Arketa window response.
    // Always run — we no longer truncate the class list.
    for (const [classId, mapped] of mapByClassId) {
      if (seen.has(classId)) continue;

      await deleteGoogleCalendarEvent({
        organizationId: loc.organization_id,
        calendarId,
        eventId: mapped.google_event_id,
        accessToken,
      });
      await admin.from("arketa_class_events").delete().eq("id", mapped.id);
      base.deleted += 1;
    }

    const statusNote = firstGoogleError
      ? `partial: ${firstGoogleError}`.slice(0, 500)
      : null;

    const hardFail =
      Boolean(firstGoogleError) &&
      base.created === 0 &&
      base.updated === 0 &&
      base.deleted === 0;

    await admin
      .from("arketa_locations")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: hardFail
          ? "error"
          : firstGoogleError
            ? "partial"
            : "ok",
        last_sync_error: statusNote,
        consecutive_failures: hardFail
          ? (loc.consecutive_failures ?? 0) + 1
          : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loc.id);

    if (hardFail) {
      return { ...base, error: firstGoogleError ?? "Sync failed" };
    }

    return base;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await admin
      .from("arketa_locations")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: message.slice(0, 500),
        consecutive_failures: (loc.consecutive_failures ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loc.id);

    return { ...base, error: message };
  }
}

/**
 * Wipe JNS Arketa events on the calendar + mapping rows, then sync once.
 * Use once to clear old duplicates before the tag system.
 */
export async function clearAndResyncArketaLocation(
  arketaLocationId: string,
): Promise<SyncLocationResult & { cleaned: number }> {
  const admin = createAdminClient();

  const { data: loc } = await admin
    .from("arketa_locations")
    .select("id, organization_id, label, google_calendar_id")
    .eq("id", arketaLocationId)
    .single();

  if (!loc?.google_calendar_id) {
    return {
      locationId: arketaLocationId,
      label: loc?.label ?? "?",
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      cleaned: 0,
      error: "Location or calendar missing",
    };
  }

  const now = new Date();
  const windowStart = new Date(
    now.getTime() - SYNC_DAYS_BACK * 24 * 60 * 60 * 1000,
  );
  const windowEnd = new Date(
    now.getTime() + SYNC_DAYS_FORWARD * 24 * 60 * 60 * 1000,
  );

  let accessToken: string | undefined;
  try {
    const { getValidGoogleAccessToken } = await import("@/lib/google/token");
    accessToken = (await getValidGoogleAccessToken(loc.organization_id))
      .accessToken;
  } catch {
    // syncArketaLocationById will surface the same error
  }

  // Delete mapped Google events
  const { data: maps } = await admin
    .from("arketa_class_events")
    .select("id, google_event_id")
    .eq("arketa_location_id", loc.id);

  for (const m of maps ?? []) {
    await deleteGoogleCalendarEvent({
      organizationId: loc.organization_id,
      calendarId: loc.google_calendar_id,
      eventId: m.google_event_id,
      accessToken,
    });
  }

  await admin
    .from("arketa_class_events")
    .delete()
    .eq("arketa_location_id", loc.id);

  // Delete unmapped old duplicates (description or tag)
  const cleaned = await deleteJnsArketaEventsInWindow({
    organizationId: loc.organization_id,
    calendarId: loc.google_calendar_id,
    timeMinIso: windowStart.toISOString(),
    timeMaxIso: windowEnd.toISOString(),
    accessToken,
  });

  const result = await syncArketaLocationById(arketaLocationId);
  return {
    ...result,
    cleaned: cleaned.deleted,
    error: result.error || cleaned.error,
  };
}

export async function syncAllArketaLocations() {
  const admin = createAdminClient();
  const { data: locs } = await admin
    .from("arketa_locations")
    .select("id")
    .not("google_calendar_id", "is", null);

  const results: SyncLocationResult[] = [];
  for (const loc of locs ?? []) {
    results.push(await syncArketaLocationById(loc.id));
  }
  return results;
}
