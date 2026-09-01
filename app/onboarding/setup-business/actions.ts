"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createOrganization(businessName: string) {
  const supabase = await createClient();

  if (!businessName.trim()) throw new Error("Business name is required");

  const { data: orgId, error } = await supabase.rpc(
    "create_organization_with_ceo",
    { business_name: businessName.trim() },
  );

  if (error || !orgId) {
    throw new Error(error?.message ?? "Could not create organization");
  }

  redirect("/dashboard");
}