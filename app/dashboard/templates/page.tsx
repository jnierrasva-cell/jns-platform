import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplateClient } from "@/components/template-client";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/onboarding/setup-business");
  if (membership.role !== "ceo") redirect("/dashboard");

  const { data: template } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("organization_id", membership.organization_id)
    .eq("template_key", "gmail_auto_ack")
    .maybeSingle();

  return (
    <TemplateClient
      orgId={membership.organization_id}
      initialSubject={
        template?.subject ?? "Thanks for reaching out!"
      }
      initialBody={
        template?.body ??
        `Hi {{first_name}},

Thanks for getting in touch! We've received your message and someone from our team will follow up with you shortly.

Talk soon,
{{business_name}}`
      }
    />
  );
}