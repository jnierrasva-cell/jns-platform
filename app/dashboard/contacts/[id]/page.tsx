import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContactDetailClient } from "@/components/contact-detail-client";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "id, email, first_name, last_name, phone, status, source, tags, last_contacted_at, created_at",
    )
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (!contact) notFound();

  const { data: activity } = await supabase
    .from("email_activity")
    .select(
      "id, direction, subject, from_email, to_email, status, created_at",
    )
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, title, starts_at, status")
    .eq("contact_id", contact.id)
    .order("starts_at", { ascending: false })
    .limit(20);

  const { data: notes } = await supabase
    .from("contact_notes")
    .select("id, body, created_at, created_by")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <Link
        href="/dashboard/contacts"
        className="text-xs text-[#60A5FA] underline underline-offset-2 hover:text-[#93C5FD]"
      >
        ← Back to Contacts
      </Link>

      <ContactDetailClient
        organizationId={membership.organization_id}
        contact={contact}
        activity={activity ?? []}
        bookings={bookings ?? []}
        notes={notes ?? []}
      />
    </div>
  );
}