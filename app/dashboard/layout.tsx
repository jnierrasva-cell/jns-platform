import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/dashboard-shell";
import { getActiveOrg } from "@/lib/org/active";
import { getPlanGateState } from "@/lib/billing/org-plan";
import { PLAN_LIMITS } from "@/lib/billing/plans";
import { needsProfileName } from "@/lib/names";
import { CompleteProfileBanner } from "@/components/complete-profile-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, status, account_type, active_organization_id, first_name, last_name",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.status === "rejected") {
    redirect("/pending-approval");
  }

  const { data: memberships } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const hasMembership = (memberships?.length ?? 0) > 0;

  if (profile) {
    try {
      await supabase
        .from("profiles")
        .update({
          status: "approved",
          account_type: profile.account_type ?? "individual",
          active_organization_id:
            profile.active_organization_id ??
            memberships?.[0]?.organization_id ??
            null,
        })
        .eq("id", user.id);
    } catch {
      // ignore
    }
  }

  if (!hasMembership) {
    if (profile?.account_type === "business") {
      redirect("/onboarding/setup-business");
    }
    redirect("/onboarding/account-type");
  }

  let active = await getActiveOrg();

  if (!active && memberships?.[0]) {
    try {
      await supabase
        .from("profiles")
        .update({
          status: "approved",
          active_organization_id: memberships[0].organization_id,
          account_type: profile?.account_type ?? "individual",
        })
        .eq("id", user.id);
    } catch {
      // ignore
    }
    active = await getActiveOrg();
  }

  if (!active) {
    redirect("/onboarding/account-type");
  }

  // Trust service role for platform role (RLS can hide role on user client)
  let platformRole = profile?.role ?? null;
  let firstName = profile?.first_name;
  let lastName = profile?.last_name;
  try {
    const admin = createAdminClient();
    const { data: adminProfile, error: adminProfileError } = await admin
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) {
      console.error(
        "Could not read the user's dashboard profile.",
        adminProfileError,
      );
    } else if (adminProfile) {
      if (adminProfile.role) platformRole = adminProfile.role;
      firstName = adminProfile.first_name;
      lastName = adminProfile.last_name;
    }
  } catch (error) {
    console.error("Could not load the user's dashboard profile.", error);
  }

  const isPlatformAdmin =
    platformRole === "super_admin" ||
    user.email?.toLowerCase() === "j.nierras.va@gmail.com";
  const isOrgManager = active.role === "ceo" || active.role === "admin";

  const gate = await getPlanGateState(active.organizationId);
  const planLabel = PLAN_LIMITS[gate.planId].label;
  const planId = gate.planId;
  const metadataFirstName =
    typeof user.user_metadata.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "";
  const metadataLastName =
    typeof user.user_metadata.last_name === "string"
      ? user.user_metadata.last_name.trim()
      : "";
  const showNamePrompt = needsProfileName(
    firstName?.trim() || metadataFirstName,
    lastName?.trim() || metadataLastName,
  );

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      isPlatformAdmin={isPlatformAdmin}
      isOrgManager={isOrgManager}
      orgName={active.orgName}
      orgKind={active.orgKind}
      orgLogoUrl={active.orgLogoUrl}
      planLabel={planLabel}
      planId={planId}
    >
      <>
        {showNamePrompt && <CompleteProfileBanner />}
        {children}
      </>
    </DashboardShell>
  );
}