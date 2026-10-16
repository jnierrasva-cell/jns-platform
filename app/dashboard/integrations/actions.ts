"use server";

import { revalidatePath } from "next/cache";
import { requireOrgManager } from "@/lib/org/auth";

export async function disconnectGoogle(organizationId: string) {
  const { supabase } = await requireOrgManager(organizationId);

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("organization_id", organizationId)
    .eq("provider", "google");

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/integrations");
}