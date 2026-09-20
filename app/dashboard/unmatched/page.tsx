import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { UnmatchedClient } from "@/components/unmatched-client";

export default async function UnmatchedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;

  const { data: rows } = await supabase
    .from("unmatched_emails")
    .select(
      "id, from_email, from_name, subject, status, created_at, gmail_message_id",
    )
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  return <UnmatchedClient organizationId={orgId} rows={rows ?? []} />;
}