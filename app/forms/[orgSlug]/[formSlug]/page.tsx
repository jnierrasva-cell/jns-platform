import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { IntakeFormClient } from "@/components/intake-form-client";
import { DEFAULT_FORM_FIELDS } from "@/lib/forms/fields";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Intake form");

export default async function PublicIntakeFormPage({
  params,
}: {
  params: Promise<{ orgSlug: string; formSlug: string }>;
}) {
  const { orgSlug, formSlug } = await params;
  const supabase = createAdminClient();

  let org: { id: string; name: string } | null = null;

  const bySlug = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (bySlug.data) {
    org = bySlug.data;
  } else {
    const byId = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgSlug)
      .maybeSingle();
    org = byId.data;
  }

  if (!org) notFound();

  const { data: form } = await supabase
    .from("intake_forms")
    .select(
      "id, name, success_message, is_published, headline, description, fields",
    )
    .eq("organization_id", org.id)
    .eq("slug", formSlug)
    .maybeSingle();

  if (!form || !form.is_published) notFound();

  const fields =
    Array.isArray(form.fields) && form.fields.length > 0
      ? form.fields
      : DEFAULT_FORM_FIELDS;

  return (
    <IntakeFormClient
      organizationId={org.id}
      formId={form.id}
      businessName={org.name}
      formName={form.name}
      headline={form.headline}
      description={form.description}
      successMessage={form.success_message}
      fields={fields}
    />
  );
}