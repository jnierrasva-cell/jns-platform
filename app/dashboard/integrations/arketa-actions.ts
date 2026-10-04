"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncArketaLocationById } from "@/lib/arketa/sync";

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

async function verifyArketaCredentials(partnerId: string, apiKey: string) {
  const res = await fetch(
    `${ARKETA_BASE}/locations?partnerId=${encodeURIComponent(partnerId)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Arketa rejected these credentials (${res.status}). Check Partner ID and API key. ${text.slice(0, 120)}`,
    );
  }

  return res.json().catch(() => ({}));
}

export async function saveArketaLocation(input: {
  organizationId: string;
  id?: string;
  label: string;
  partnerId: string;
  apiKey: string;
  googleCalendarId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOrgManager(input.organizationId);

    const label = input.label.trim();
    const partnerId = input.partnerId.trim();
    const apiKey = input.apiKey.trim();
    const googleCalendarId = input.googleCalendarId?.trim() || null;

    if (!label) return { ok: false, error: "Label is required" };
    if (!partnerId) return { ok: false, error: "Partner ID is required" };
    if (!apiKey) return { ok: false, error: "API key is required" };

    await verifyArketaCredentials(partnerId, apiKey);

    const admin = createAdminClient();
    const row = {
      organization_id: input.organizationId,
      label,
      partner_id: partnerId,
      api_key: apiKey,
      google_calendar_id: googleCalendarId,
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
): Promise<
  | { ok: true; message: string }
  | { ok: false; error: string }
> {
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

    const json = await verifyArketaCredentials(data.partner_id, data.api_key);
    const count = Array.isArray(json?.items) ? json.items.length : 0;

    return {
      ok: true,
      message: `Credentials work. Arketa returned ${count} location(s).`,
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
