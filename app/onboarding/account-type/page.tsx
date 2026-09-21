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
    .select("status, account_type, active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && profile.status !== "approved") {
    await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", user.id);
  }

  // Invited users already have a membership — never trap them here
  const { data: memberships } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(5);

  if (memberships && memberships.length > 0) {
    const orgId =
      profile?.active_organization_id &&
      memberships.some((m) => m.organization_id === profile.active_organization_id)
        ? profile.active_organization_id
        : memberships[0].organization_id;

    await supabase
      .from("profiles")
      .update({
        status: "approved",
        account_type: profile?.account_type ?? "individual",
        active_organization_id: orgId,
      })
      .eq("id", user.id);

    redirect("/dashboard");
  }

  // No membership yet — normal first-time onboarding
  if (profile?.account_type === "business") {
    redirect("/onboarding/setup-business");
  }

  if (profile?.account_type === "individual") {
    // Individual without org is broken state → show picker again
  }

  return <AccountTypeClient />;
}