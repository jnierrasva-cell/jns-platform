import { createAdminClient } from "@/lib/supabase/admin";
import { fetchArketaClasses } from "@/lib/arketa/client";
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google/calendar";

export type SyncLocationResult = {
  locationId: string;
  label: string;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  error?: string;
};

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

function classEndIso(startIso: string, durationMinutes: number) {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + (durationMinutes || 60) * 60 * 1000);
  return end.toISOString();
}

export async function syncArketaLocationById(
  arketaLocationId: string,
): Promise<SyncLocationResult> {
  const admin = createAdminClient();

  const { data: loc, error } = await admin
    .from("arketa_locations")
    .select(
      "id, organization_id, label, partner_id, api_key, google_calendar_id",
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
      error: "Location not found",
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

  if (!loc.google_calendar_id?.trim()) {
    await admin
      .from("arketa_locations")
      .update({
        last_sync_status: "error",
        last_sync_error: "Google Calendar ID missing",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", loc.id);

    return { ...base, error: "Google Calendar ID missing" };
  }

  const calendarId = loc.google_calendar_id.trim();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  try {
    const classes = await fetchArketaClasses({
      partnerId: loc.partner_id,
      apiKey: loc.api_key,
      startDate: toDateParam(windowStart),
      endDate: toDateParam(windowEnd),
    });

    const { data: existingMaps } = await admin
      .from("arketa_class_events")
      .select("id, arketa_class_id, google_event_id")
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
      const mapped = mapByClassId.get(cls.id);

      if (inactive) {
        if (mapped) {
          await deleteGoogleCalendarEvent({
            organizationId: loc.organization_id,
            calendarId,
            eventId: mapped.google_event_id,
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

      const title = cls.name || "Class";
      const startsAt = cls.start_time;
      const endsAt = classEndIso(cls.start_time, cls.duration);
      const description = [
        cls.instructor_name ? `Instructor: ${cls.instructor_name}` : null,
        "Synced from Arketa via JNS",
        cls.description?.slice(0, 500) || null,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (mapped) {
        const upd = await updateGoogleCalendarEvent({
          organizationId: loc.organization_id,
          calendarId,
          eventId: mapped.google_event_id,
          title,
          startsAt,
          endsAt,
          description,
        });
        if (!upd.ok) {
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
        });
        if (!created.eventId) {
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

    // Mapped classes no longer returned in window → remove from Google
    for (const [classId, mapped] of mapByClassId) {
      if (seen.has(classId)) continue;
      await deleteGoogleCalendarEvent({
        organizationId: loc.organization_id,
        calendarId,
        eventId: mapped.google_event_id,
      });
      await admin.from("arketa_class_events").delete().eq("id", mapped.id);
      base.deleted += 1;
    }

    await admin
      .from("arketa_locations")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "ok",
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loc.id);

    return base;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await admin
      .from("arketa_locations")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", loc.id);

    return { ...base, error: message };
  }
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