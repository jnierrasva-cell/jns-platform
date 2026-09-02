"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function disconnectGoogle(organizationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("organization_id", organizationId)
    .eq("provider", "google");

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}