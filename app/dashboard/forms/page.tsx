import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { FormsClient } from "@/components/forms-client";
import { DEFAULT_FORM_FIELDS } from "@/app/dashboard/forms/actions";

export default async function FormsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("id", orgId)
    .maybeSingle();

  const { data: forms } = await admin
    .from("intake_forms")
    .select(
      "id, name, slug, is_published, success_message, created_at, headline, description, fields",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data: counts } = await admin
    .from("intake_submissions")
    .select("form_id")
    .eq("organization_id", orgId);

  const submissionCountByForm: Record<string, number> = {};
  for (const row of counts ?? []) {
    const id = row.form_id as string;
    if (!id) continue;
    submissionCountByForm[id] = (submissionCountByForm[id] ?? 0) + 1;
  }

  const formsWithMeta = (forms ?? []).map((f) => ({
    ...f,
    fields:
      Array.isArray(f.fields) && f.fields.length > 0
        ? f.fields
        : DEFAULT_FORM_FIELDS,
    submission_count: submissionCountByForm[f.id] ?? 0,
  }));

  return (
    <FormsClient
      organizationId={orgId}
      orgSlug={org?.slug ?? orgId}
      orgName={org?.name ?? "Workspace"}
      forms={formsWithMeta}
    />
  );
}