import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();

  // Parallel reads — cuts sequential layout lag on this route.
  const [contactsRes, stagesRes, googleRes, twilioRes] = await Promise.all([
    admin
      .from("contacts")
      .select(
        "id, email, first_name, last_name, phone, status, source, tags, last_contacted_at, created_at, pipeline_stage_id",
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("pipeline_stages")
      .select("id, name, slug, position, is_won, is_lost")
      .eq("organization_id", orgId)
      .order("position", { ascending: true }),
    supabase
      .from("connections")
      .select("id")
      .eq("organization_id", orgId)
      .eq("provider", "google")
      .maybeSingle(),
    supabase
      .from("twilio_connections")
      .select("id")
      .eq("organization_id", orgId)
      .maybeSingle(),
  ]);

  return (
    <ContactsClient
      organizationId={orgId}
      contacts={contactsRes.data ?? []}
      stages={stagesRes.data ?? []}
      googleConnected={Boolean(googleRes.data)}
      twilioConnected={Boolean(twilioRes.data)}
    />
  );
}
