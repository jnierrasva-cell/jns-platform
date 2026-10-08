"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  syncArketaLocationById,
  clearAndResyncArketaLocation,
} from "@/lib/arketa/sync";

const ARKETA_BASE =
  "https://us-central1-sutra-prod.cloudfunctions.net/partnerApi/v0";

async function requireOrgManager(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership || !["ceo", "admin"].includes(membership.role)) {
    throw new Error(
      "Ask your organization owner to give you Admin access for Arketa.",
    );
  }

  return { supabase, user };
}

function parseInstructorMap(text?: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!text?.trim()) return map;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(.+?)\s*[=:]\s*(\S+@\S+)\s*$/);
    if (m) {
      map[m[1].trim().toLowerCase()] = m[2].trim().toLowerCase();
    }
  }
  return map;
}

async function verifyArketaCredentials(
  partnerId: string,
  apiKey: string,
): Promise<{ classCount: number }> {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  const url = new URL(
    `${ARKETA_BASE}/${encodeURIComponent(partnerId)}/classes`,
  );
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const clean = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    throw new Error(
      `Arketa rejected these credentials (${res.status}). Check Partner ID and API key.${clean ? ` ${clean}` : ""}`,
    );
  }

  const json = (await res.json().catch(() => ({}))) as {
    items?: unknown[];
  };
  const classCount = Array.isArray(json.items) ? json.items.length : 0;
  return { classCount };
}

export async function saveArketaLocation(input: {
  organizationId: string;
  id?: string;
  label: string;
  partnerId: string;
  apiKey: string;
  googleCalendarId?: string;
  instructorEmailMapText?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOrgManager(input.organizationId);

    const label = input.label.trim();
    const partnerId = input.partnerId.trim();
    let apiKey = input.apiKey.trim();
    const googleCalendarId = input.googleCalendarId?.trim() || null;
    const instructor_email_map = parseInstructorMap(
      input.instructorEmailMapText,
    );

    if (!label) return { ok: false, error: "Label is required" };
    if (!partnerId) return { ok: false, error: "Partner ID is required" };

    const admin = createAdminClient();

    // Edit: empty API key keeps the existing key
    if (input.id && !apiKey) {
      const { data: existing } = await admin
        .from("arketa_locations")
        .select("api_key")
        .eq("id", input.id)
        .eq("organization_id", input.organizationId)
        .maybeSingle();
      if (!existing?.api_key) {
        return { ok: false, error: "API key is required" };
      }
      apiKey = existing.api_key as string;
    }

    if (!apiKey) return { ok: false, error: "API key is required" };

    await verifyArketaCredentials(partnerId, apiKey);

    const row = {
      organization_id: input.organizationId,
      label,
      partner_id: partnerId,
      api_key: apiKey,
      google_calendar_id: googleCalendarId,
      instructor_email_map,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { error } = await admin
        .from("arketa_locations")
        .update(row)
        .eq("id", input.id)
        .eq("organization_id", input.organizationId);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await admin.from("arketa_locations").insert(row);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard/integrations");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save location",
    };
  }
}

export async function deleteArketaLocation(
  organizationId: string,
  locationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOrgManager(organizationId);
    const admin = createAdminClient();

    const { error } = await admin
      .from("arketa_locations")
      .delete()
      .eq("id", locationId)
      .eq("organization_id", organizationId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/integrations");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not delete",
    };
  }
}

export async function testArketaLocation(
  organizationId: string,
  locationId: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    await requireOrgManager(organizationId);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("arketa_locations")
      .select("partner_id, api_key, label")
      .eq("id", locationId)
      .eq("organization_id", organizationId)
      .single();

    if (error || !data) return { ok: false, error: "Location not found" };

    const { classCount } = await verifyArketaCredentials(
      data.partner_id,
      data.api_key,
    );

    return {
      ok: true,
      message: `Credentials work for “${data.label}”. Arketa returned ${classCount} class(es) in the next 7 days.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Test failed",
    };
  }
}

export async function syncArketaLocation(
  organizationId: string,
  locationId: string,
): Promise<
  | {
      ok: true;
      label: string;
      created: number;
      updated: number;
      deleted: number;
      skipped: number;
    }
  | { ok: false; error: string }
> {
  try {
    await requireOrgManager(organizationId);
    const admin = createAdminClient();

    const { data: loc } = await admin
      .from("arketa_locations")
      .select("id")
      .eq("id", locationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!loc) return { ok: false, error: "Location not found" };

    const result = await syncArketaLocationById(locationId);
    revalidatePath("/dashboard/integrations");

    if (result.error) {
      return {
        ok: false,
        error: `${result.label}: ${result.error} (created ${result.created}, updated ${result.updated})`,
      };
    }

    return {
      ok: true,
      label: result.label,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      skipped: result.skipped,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
}

export async function clearAndResyncArketaLocationAction(
  organizationId: string,
  locationId: string,
): Promise<
  | {
      ok: true;
      label: string;
      created: number;
      updated: number;
      deleted: number;
      skipped: number;
      cleaned: number;
    }
  | { ok: false; error: string }
> {
  try {
    await requireOrgManager(organizationId);
    const admin = createAdminClient();

    const { data: loc } = await admin
      .from("arketa_locations")
      .select("id")
      .eq("id", locationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!loc) return { ok: false, error: "Location not found" };

    const result = await clearAndResyncArketaLocation(locationId);
    revalidatePath("/dashboard/integrations");

    if (result.error && result.created === 0 && result.updated === 0) {
      return { ok: false, error: `${result.label}: ${result.error}` };
    }

    return {
      ok: true,
      label: result.label,
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      skipped: result.skipped,
      cleaned: result.cleaned,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Clear & resync failed",
    };
  }
}
