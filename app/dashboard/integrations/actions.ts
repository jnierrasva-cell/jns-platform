"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgManager } from "@/lib/org/auth";

export async function disconnectGoogle(
  organizationId: string,
  _formData?: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  void _formData;

  try {
    if (!organizationId) {
      return { ok: false, error: "Missing organization" };
    }

    await requireOrgManager(organizationId);

    const admin = createAdminClient();
    const { error } = await admin
      .from("connections")
      .delete()
      .eq("organization_id", organizationId)
      .eq("provider", "google");

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/integrations");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Disconnect failed",
    };
  }
}