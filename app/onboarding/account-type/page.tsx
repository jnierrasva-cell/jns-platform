import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountTypeClient } from "@/components/account-type-client";

export default async function AccountTypePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, account_type")
    .eq("id", user.id)
    .maybeSingle();

  // Keep status healthy even for older rows
  if (profile && profile.status !== "approved") {
    await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", user.id);
  }

  if (profile?.account_type) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership) redirect("/dashboard");
    if (profile.account_type === "business") {
      redirect("/onboarding/setup-business");
    }
  }

  return <AccountTypeClient />;
}