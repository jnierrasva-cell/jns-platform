import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";

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
    .select("role, status, account_type")
    .eq("id", user.id)
    .single();

  if (profile && profile.status !== "approved") {
    await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", user.id);
  }

  if (!profile?.account_type) {
    redirect("/onboarding/account-type");
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    if (profile.account_type === "business") {
      redirect("/onboarding/setup-business");
    }
    redirect("/onboarding/account-type");
  }

  const orgName = Array.isArray(membership.organizations)
    ? membership.organizations[0]?.name
    : (membership.organizations as { name: string } | null)?.name;

  const isPlatformAdmin = profile?.role === "super_admin";
  const isOrgManager =
    membership.role === "ceo" || membership.role === "admin";


  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      isPlatformAdmin={isPlatformAdmin}
      isOrgManager={isOrgManager}
      orgName={orgName ?? "Your workspace"}
    >
      {children}
    </DashboardShell>
  )
};