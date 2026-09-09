import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { IntakeFormClient } from "@/components/intake-form-client";

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
    .select("id, name, success_message, is_published")
    .eq("organization_id", org.id)
    .eq("slug", formSlug)
    .maybeSingle();

  if (!form || !form.is_published) notFound();

  return (
    <IntakeFormClient
      organizationId={org.id}
      formId={form.id}
      businessName={org.name}
      formName={form.name}
      successMessage={form.success_message}
    />
  );
}