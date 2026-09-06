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

  const { data: contacts } = await supabase
    .from("contacts")
    .select(
      "id, email, first_name, last_name, phone, status, source, last_contacted_at, created_at",
    )
    .eq("organization_id", membership.organization_id)
    .order("last_contacted_at", { ascending: false, nullsFirst: false });

  return <ContactsClient contacts={contacts ?? []} />;
}