import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamClient } from "@/components/team-client";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organization_id, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding/setup-business");
  if (membership.role !== "ceo") redirect("/dashboard");

  const orgName = Array.isArray(membership.organizations)
    ? membership.organizations[0]?.name
    : (membership.organizations as { name: string } | null)?.name;

  const { data: members } = await supabase
    .from("org_members")
    .select("user_id, role, profiles(email, business_name)")
    .eq("organization_id", membership.organization_id);

  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, role, status, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  return (
    <TeamClient
      orgId={membership.organization_id}
      orgName={orgName ?? "Your workspace"}
      members={members ?? []}
      invites={invites ?? []}
    />
  );
}