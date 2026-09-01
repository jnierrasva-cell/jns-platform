import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupBusinessClient } from "@/components/setup-business-client";

export default async function SetupBusinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status !== "approved") redirect("/pending-approval");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Already belongs to an org (either created one, or accepted an invite
  // before this page loaded) — nothing to set up, go straight in.
  if (membership) redirect("/dashboard");

  return <SetupBusinessClient />;
}