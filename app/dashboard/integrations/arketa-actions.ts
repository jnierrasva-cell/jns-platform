"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
      "You don’t have permission to manage integrations. Ask your organization owner to grant you Admin access.",
    );
  }

  return supabase;
}

async function verifyArketaCredentials(partnerId: string, apiKey: string) {
  const res = await fetch(
    `${ARKETA_BASE}/${encodeURIComponent(partnerId)}/locations`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(
      `Arketa rejected these credentials (${res.status}). Check Partner ID and API key.`,
    );
  }

  return res.json();
}

export async function saveArketaLocation(input: {
  organizationId: string;
  id?: string;
  label: string;
  partnerId: string;
  apiKey: string;
  googleCalendarId?: string;
}) {
  const supabase = await requireOrgManager(input.organizationId);

  const label = input.label.trim();
  const partnerId = input.partnerId.trim();
  const apiKey = input.apiKey.trim();
  const googleCalendarId = input.googleCalendarId?.trim() || null;

  if (!label) throw new Error("Location label is required");
  if (!partnerId) throw new Error("Partner ID is required");
  if (!apiKey) throw new Error("API key is required");

  await verifyArketaCredentials(partnerId, apiKey);

  const row = {
    organization_id: input.organizationId,
    label,
    partner_id: partnerId,
    api_key: apiKey,
    google_calendar_id: googleCalendarId,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("arketa_locations")
      .update(row)
      .eq("id", input.id)
      .eq("organization_id", input.organizationId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("arketa_locations").insert(row);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/integrations");
}

export async function deleteArketaLocation(
  organizationId: string,
  locationId: string,
) {
  const supabase = await requireOrgManager(organizationId);

  const { error } = await supabase
    .from("arketa_locations")
    .delete()
    .eq("id", locationId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/integrations");
}

export async function testArketaLocation(
  organizationId: string,
  locationId: string,
) {
  const supabase = await requireOrgManager(organizationId);

  const { data, error } = await supabase
    .from("arketa_locations")
    .select("partner_id, api_key, label")
    .eq("id", locationId)
    .eq("organization_id", organizationId)
    .single();

  if (error || !data) throw new Error("Location not found");

  const json = await verifyArketaCredentials(data.partner_id, data.api_key);
  const count = Array.isArray(json?.items) ? json.items.length : 0;

  return {
    label: data.label,
    locationsFound: count,
    message: `Credentials work. Arketa returned ${count} location(s).`,
  };
}

export async function syncArketaLocation(
  organizationId: string,
  locationId: string,
) {
  await requireOrgManager(organizationId);

  const supabase = await createClient();
  const { data: loc } = await supabase
    .from("arketa_locations")
    .select("id")
    .eq("id", locationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!loc) throw new Error("Location not found");

  const result = await syncArketaLocationById(locationId);
  revalidatePath("/dashboard/integrations");

  if (result.error) {
    throw new Error(
      `${result.label}: ${result.error} (created ${result.created}, updated ${result.updated})`,
    );
  }

  return result;
}