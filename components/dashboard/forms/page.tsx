import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FormsClient } from "@/components/forms-client";

export default async function FormsPage() {
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

  const orgId = membership.organization_id;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", orgId)
    .maybeSingle();

  const { data: forms } = await supabase
    .from("intake_forms")
    .select("id, name, slug, is_published, success_message, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const { data: submissions } = await supabase
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