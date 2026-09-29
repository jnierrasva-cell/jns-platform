import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { EmailRulesClient } from "@/components/email-rules-client";

export default async function EmailRulesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;

  const { data: rules } = await supabase
    .from("email_rules")
    .select(
      "id, name, is_enabled, priority, from_email, from_domain, subject_contains, only_new_contact, action, tag, template_key, created_at",
    )
    .eq("organization_id", orgId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: templates } = await supabase
    .from("email_templates")
    .select("template_key")
    .eq("organization_id", orgId);

  const templateKeys = [
    "gmail_auto_ack",
    ...new Set((templates ?? []).map((t) => t.template_key)),
  ];

  return (
    <EmailRulesClient
      organizationId={orgId}
      rules={rules ?? []}
      templateKeys={templateKeys}
    />
  );
}
