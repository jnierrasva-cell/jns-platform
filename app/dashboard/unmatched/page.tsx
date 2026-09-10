import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UnmatchedClient } from "@/components/unmatched-client";

export default async function UnmatchedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding/setup-business");

  const orgId = membership.organization_id;

  const { data: rows } = await supabase
    .from("unmatched_emails")
    .select(
      "id, from_email, from_name, subject, status, created_at, gmail_message_id",
    )
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <UnmatchedClient organizationId={orgId} rows={rows ?? []} />
  );
}