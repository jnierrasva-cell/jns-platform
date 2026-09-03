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
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "approved") redirect("/pending-approval");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding/setup-business");

  const orgName = Array.isArray(membership.organizations)
    ? membership.organizations[0]?.name
    : (membership.organizations as { name: string } | null)?.name;

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      isAdmin={profile?.role === "admin"}
      isOrgCeo={membership.role === "ceo"}
      orgName={orgName ?? "Your workspace"}
    >
      {children}
    </DashboardShell>
  );
}