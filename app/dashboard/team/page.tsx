import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { TeamClient } from "@/components/team-client";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  if (active.role !== "ceo" && active.role !== "admin") {
    redirect("/dashboard");
  }

  const orgId = active.organizationId;

  const { data: members } = await supabase
    .from("org_members")
    .select("user_id, role, profiles(email, business_name)")
    .eq("organization_id", orgId);

  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, role, status, token, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://jns-platform.vercel.app";

  return (
    <TeamClient
      orgId={orgId}
      orgName={active.orgName}
      members={members ?? []}
      invites={invites ?? []}
      appOrigin={origin}
    />
  );
}