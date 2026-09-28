import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { TemplateClient } from "@/components/template-client";

const DEFAULTS = [
  {
    template_key: "gmail_auto_ack",
    label: "Email auto-ack",
    subject: "Thanks for reaching out!",
    body: `Hi {{first_name}},

Thanks for getting in touch! We've received your message and someone from our team will follow up shortly.

Talk soon,
{{business_name}}`,
  },
  {
    template_key: "form_thanks",
    label: "Form thank-you",
    subject: "We received your form",
    body: `Hi {{first_name}},

Thanks for submitting the form. We'll review it and get back to you soon.

{{business_name}}`,
  },
];

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

  const { data: rows } = await supabase
    .from("email_templates")
    .select("template_key, subject, body, updated_at")
    .eq("organization_id", orgId)
    .order("template_key");

  const byKey = new Map((rows ?? []).map((r) => [r.template_key, r]));

  const templates = DEFAULTS.map((d) => {
    const saved = byKey.get(d.template_key);
    return {
      template_key: d.template_key,
      label: d.label,
      subject: saved?.subject ?? d.subject,
      body: saved?.body ?? d.body,
    };
  });

  // Extra custom templates beyond defaults
  for (const r of rows ?? []) {
    if (!DEFAULTS.some((d) => d.template_key === r.template_key)) {
      templates.push({
        template_key: r.template_key,
        label: r.template_key,
        subject: r.subject,
        body: r.body,
      });
    }
  }

  return <TemplateClient orgId={orgId} templates={templates} />;
}