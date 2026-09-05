import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmailRulesClient } from "@/components/email-rules-client";

export default async function EmailRulesPage() {
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

  const { data: rules } = await supabase
    .from("email_rules")
    .select(
      "id, name, is_enabled, priority, from_email, from_domain, subject_contains, only_new_contact, action, tag, created_at",
    )
    .eq("organization_id", membership.organization_id)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <EmailRulesClient
      organizationId={membership.organization_id}
      rules={rules ?? []}
    />
  );
}