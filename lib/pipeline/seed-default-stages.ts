import { createAdminClient } from "@/lib/supabase/admin";

/** Default stages shown on Overview (Lead, Booked, Customer, Inactive). */
const DEFAULT_STAGES = [
  { name: "Lead", slug: "lead", position: 0, is_won: false, is_lost: false },
  { name: "Booked", slug: "booked", position: 1, is_won: false, is_lost: false },
  { name: "Customer", slug: "customer", position: 2, is_won: true, is_lost: false },
  { name: "Inactive", slug: "inactive", position: 3, is_won: false, is_lost: true },
] as const;

/**
 * Ensure an organization has the four default pipeline stages.
 * Safe to call repeatedly — only inserts when the org has zero stages.
 */
export async function ensureDefaultPipelineStages(
  organizationId: string,
): Promise<{ seeded: boolean }> {
  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from("pipeline_stages")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (countError) {
    console.error("[ensureDefaultPipelineStages] count failed:", countError);
    return { seeded: false };
  }

  if ((count ?? 0) > 0) {
    return { seeded: false };
  }

  const rows = DEFAULT_STAGES.map((s) => ({
    organization_id: organizationId,
    name: s.name,
    slug: s.slug,
    position: s.position,
    is_won: s.is_won,
    is_lost: s.is_lost,
  }));

  const { error } = await admin.from("pipeline_stages").insert(rows);

  if (error) {
    console.error("[ensureDefaultPipelineStages] insert failed:", error);
    return { seeded: false };
  }

  return { seeded: true };
}
