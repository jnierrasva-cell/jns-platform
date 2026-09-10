import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingsClient } from "@/components/bookings-client";

export default async function BookingsPage() {
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
    .select("slug")
    .eq("id", orgId)
    .maybeSingle();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, title, starts_at, ends_at, status, source, notes, contact_id, reminder_sms_sent_at, contacts(id, email, first_name, last_name, phone)",
    )
    .eq("organization_id", orgId)
    .order("starts_at", { ascending: true });

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, phone")
    .eq("organization_id", orgId)
    .order("first_name", { ascending: true });

  const { data: smsAutomation } = await supabase
    .from("org_automations")
    .select("is_enabled")
    .eq("organization_id", orgId)
    .eq("service_key", "sms-reminders")
    .maybeSingle();

  const { data: twilio } = await supabase
    .from("twilio_connections")
    .select("id")
    .eq("organization_id", orgId)
    .maybeSingle();

  const publicBookingPath = `/book/${org?.slug ?? orgId}`;

  return (
    <BookingsClient
      organizationId={orgId}
      bookings={bookings ?? []}
      contacts={contacts ?? []}
      smsRemindersEnabled={Boolean(smsAutomation?.is_enabled)}
      twilioConnected={Boolean(twilio)}
      publicBookingPath={publicBookingPath}
    />
  );
}