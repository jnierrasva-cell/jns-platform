import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { TemplateClient } from "@/components/template-client";

export default async function TemplatesPage() {
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

  const { data: template } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("organization_id", orgId)
    .eq("template_key", "gmail_auto_ack")
    .maybeSingle();

  return (
    <TemplateClient
      orgId={orgId}
      initialSubject={template?.subject ?? "Thanks for reaching out!"}
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