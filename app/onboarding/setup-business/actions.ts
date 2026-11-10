"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultPipelineStages } from "@/lib/pipeline/seed-default-stages";
import { startProTrial } from "@/lib/billing/trial";
import { applyNicheKit } from "@/lib/niches/apply-kit";
import {
  isBusinessSizeKey,
  resolveKitFromOnboardingInput,
  type BusinessSizeKey,
} from "@/lib/niches/business-types";

export async function createOrganization(
  businessName: string,
  businessType?: string,
  businessSize?: string,
): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.status === "rejected") {
    return {
      ok: false,
      error: "This account cannot access a JNS workspace.",
    };
  }

  if (!businessName.trim()) {
    return { ok: false, error: "Business name is required" };
  }

  if (!businessType?.trim()) {
    return { ok: false, error: "Choose a business type" };
  }

  if (!businessSize?.trim() || !isBusinessSizeKey(businessSize)) {
    return { ok: false, error: "Choose a business size" };
  }

  const sizeKey = businessSize as BusinessSizeKey;
  const { businessType: typeKey, kit: nicheKey } =
    resolveKitFromOnboardingInput(businessType);

  const { data: orgId, error } = await supabase.rpc(
    "create_organization_with_ceo",
    { business_name: businessName.trim() },
  );

  if (error || !orgId) {
    return {
      ok: false,
      error: error?.message ?? "Could not create organization",
    };
  }

  // kind + optional analytics fields (columns may be missing until SQL is applied)
  const { data: organization, error: kindError } = await admin
    .from("organizations")
    .update({
      kind: "business",
      business_type: typeKey,
      business_size: sizeKey,
    })
    .eq("id", orgId as string)
    .select("id")
    .maybeSingle();

  if (kindError) {
    // Retry kind-only if new columns are not migrated yet
    const { data: org2, error: kindOnly } = await admin
      .from("organizations")
      .update({ kind: "business" })
      .eq("id", orgId as string)
      .select("id")
      .maybeSingle();

    if (kindOnly || !org2) {
      return {
        ok: false,
        error: kindError.message || kindOnly?.message || "Could not update organization",
      };
    }
  } else if (!organization) {
    return { ok: false, error: "Could not mark organization as a business." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      active_organization_id: orgId as string,
      account_type: "business",
      status: "approved",
    })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  // Starter kit from mapped type (not user-facing niche jargon)
  const kitResult = await applyNicheKit(orgId as string, nicheKey);
  if (!kitResult.ok) {
    await ensureDefaultPipelineStages(orgId as string);
  }

  await startProTrial(orgId as string);

  return { ok: true, next: "/dashboard/workspace?welcome=1" };
}
