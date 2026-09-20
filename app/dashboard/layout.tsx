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

  const active = await getActiveOrg();

  if (!active) {
    if (profile.account_type === "business") {
      redirect("/onboarding/setup-business");
    }
    redirect("/onboarding/account-type");
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