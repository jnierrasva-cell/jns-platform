"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createOrganization(businessName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");
  if (!businessName.trim()) throw new Error("Business name is required");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: businessName.trim() })
    .select("id")
    .single();

  if (orgError || !org) {
    throw new Error(orgError?.message ?? "Could not create organization");
  }

  const { error: memberError } = await supabase.from("org_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "ceo",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  redirect("/dashboard");
}