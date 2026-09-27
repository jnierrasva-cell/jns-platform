import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();

  const { data: memberRows } = await admin
    .from("org_members")
    .select("user_id, role")
    .eq("organization_id", orgId);

  const userIds = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } =
    userIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, email, business_name")
          .in("id", userIds)
      : { data: [] as { id: string; email: string | null; business_name: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const members = (memberRows ?? []).map((m) => {
    const p = profileById.get(m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      profiles: p
        ? { email: p.email, business_name: p.business_name }
        : null,
    };
  });

  const { data: invites } = await admin
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
      members={members}
      invites={invites ?? []}
      appOrigin={origin}
    />
  );
}
