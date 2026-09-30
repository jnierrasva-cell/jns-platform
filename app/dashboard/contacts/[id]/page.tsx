import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
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

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;

  // Admin read after membership check — avoids RLS hiding intake-created contacts
  const admin = createAdminClient();

  const { data: contact } = await admin
    .from("contacts")
    .select(
      "id, email, first_name, last_name, phone, status, source, tags, last_contacted_at, created_at, pipeline_stage_id",
    )
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!contact) notFound();

  const { data: stages } = await admin
    .from("pipeline_stages")
    .select("id, name, slug, position, is_won, is_lost")
    .eq("organization_id", orgId)
    .order("position", { ascending: true });

  const { data: activity } = await admin
    .from("email_activity")
    .select(
      "id, direction, subject, from_email, to_email, status, created_at",
    )
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: bookings } = await admin
    .from("bookings")
    .select("id, title, starts_at, status")
    .eq("contact_id", contact.id)
    .order("starts_at", { ascending: false })
    .limit(20);

  const { data: notes } = await admin
    .from("contact_notes")
    .select("id, body, created_at, created_by")
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <Link
        href="/dashboard/contacts"
        className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
      >
        ← Back to Contacts
      </Link>

      <ContactDetailClient
        organizationId={orgId}
        contact={contact}
        stages={stages ?? []}
        activity={activity ?? []}
        bookings={bookings ?? []}
        notes={notes ?? []}
      />
    </div>
  );
}
