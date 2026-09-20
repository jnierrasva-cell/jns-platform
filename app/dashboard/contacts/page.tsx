import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrg } from "@/lib/org/active";
import { ContactsClient } from "@/components/contacts-client";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;

  const { data: contacts } = await supabase
    .from("contacts")
    .select(
      "id, email, first_name, last_name, phone, status, source, tags, last_contacted_at, created_at, pipeline_stage_id",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, slug, position, is_won, is_lost")
    .eq("organization_id", orgId)
    .order("position", { ascending: true });

  const { data: googleConnection } = await supabase
    .from("connections")
    .select("id")
    .eq("organization_id", orgId)
    .eq("provider", "google")
    .maybeSingle();

  const { data: twilioConnection } = await supabase
    .from("twilio_connections")
    .select("id")
    .eq("organization_id", orgId)
    .maybeSingle();

  return (
    <ContactsClient
      organizationId={orgId}
      contacts={contacts ?? []}
      stages={stages ?? []}
      googleConnected={Boolean(googleConnection)}
      twilioConnected={Boolean(twilioConnection)}
    />
  );
}