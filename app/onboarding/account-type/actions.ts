"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setAccountType(type: "individual" | "business") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");
  if (type !== "individual" && type !== "business") {
    throw new Error("Invalid account type");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      account_type: type,
      status: "approved",
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  if (type === "business") {
    redirect("/onboarding/setup-business");
  }

  // Individual: create a personal workspace automatically
  const emailPrefix =
    user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, " ") || "Personal";
  const workspaceName = `${emailPrefix} workspace`.trim();

  const { data: orgId, error: orgError } = await supabase.rpc(
    "create_organization_with_ceo",
    { business_name: workspaceName },
  );

  if (orgError || !orgId) {
    throw new Error(orgError?.message ?? "Could not create workspace");
  }

  redirect("/dashboard");
}