import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { FormsClient } from "@/components/forms-client";

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
    .select("id, name, slug, is_published, success_message, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const { data: submissions } = await admin
    .from("intake_submissions")
    .select(
      "id, name, email, phone, message, created_at, form_id, contact_id, intake_forms(name)",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <FormsClient
      organizationId={orgId}
      orgSlug={org?.slug ?? orgId}
      forms={forms ?? []}
      submissions={submissions ?? []}
    />
  );
}
