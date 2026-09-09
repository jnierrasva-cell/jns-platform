import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactsClient } from "@/components/contacts-client";

export default async function ContactsPage() {
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

  const { data: contacts } = await supabase
    .from("contacts")
    .select(
      "id, email, first_name, last_name, phone, status, source, tags, last_contacted_at, created_at",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <ContactsClient
      organizationId={orgId}
      contacts={contacts ?? []}
    />
  );
}