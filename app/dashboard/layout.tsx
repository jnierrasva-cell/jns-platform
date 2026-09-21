import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { getActiveOrg } from "@/lib/org/active";

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
    .select("role, status, account_type, active_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  // Any org membership means they belong somewhere (e.g. invited)
  const { data: memberships } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const hasMembership = (memberships?.length ?? 0) > 0;

  // Heal profile so we never bounce invitees back to onboarding
  if (user && (!profile?.status || profile.status !== "approved" || !profile.account_type || !profile.active_organization_id)) {
    const fallbackOrgId =
      profile?.active_organization_id ||
      memberships?.[0]?.organization_id ||
      null;

    await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email ?? null,
        status: "approved",
        account_type: profile?.account_type ?? "individual",
        active_organization_id: fallbackOrgId,
        role: profile?.role ?? "user",
      })
      .eq("id", user.id);
  }

  // Still no membership and no account type → real onboarding
  if (!hasMembership && !profile?.account_type) {
    redirect("/onboarding/account-type");
  }

  if (!hasMembership && profile?.account_type === "business") {
    redirect("/onboarding/setup-business");
  }

  if (!hasMembership) {
    redirect("/onboarding/account-type");
  }

  const active = await getActiveOrg();
  if (!active) {
    // Last resort: use first membership without looping to account-type
    const first = memberships![0];
    await supabase
      .from("profiles")
      .update({
        active_organization_id: first.organization_id,
        account_type: profile?.account_type ?? "individual",
        status: "approved",
      })
      .eq("id", user.id);

    const retry = await getActiveOrg();
    if (!retry) redirect("/login");

    const isPlatformAdmin = profile?.role === "super_admin";
    const isOrgManager = retry.role === "ceo" || retry.role === "admin";

    return (
      <DashboardShell
        userEmail={user.email ?? ""}
        isPlatformAdmin={isPlatformAdmin}
        isOrgManager={isOrgManager}
        orgName={retry.orgName}
      >
        {children}
      </DashboardShell>
    );
  }

  const isPlatformAdmin = profile?.role === "super_admin";
  const isOrgManager = active.role === "ceo" || active.role === "admin";

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      isPlatformAdmin={isPlatformAdmin}
      isOrgManager={isOrgManager}
      orgName={active.orgName}
    >
      {children}
    </DashboardShell>
  );
}