import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
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
    .select("role, organization_id, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding/setup-business");

  const orgName = Array.isArray(membership.organizations)
    ? membership.organizations[0]?.name
    : (membership.organizations as { name: string } | null)?.name;

  const { data: googleConnection } = await supabase
    .from("connections")
    .select("connected_email, created_at")
    .eq("organization_id", membership.organization_id)
    .eq("provider", "google")
    .maybeSingle();

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      isAdmin={profile?.role === "admin"}
      isOrgCeo={membership.role === "ceo"}
      orgId={membership.organization_id}
      orgName={orgName ?? "Your workspace"}
      googleConnection={googleConnection ?? null}
      googleStatusParam={params.google_connected ? "connected" : params.google_error ?? null}
    />
  );
}