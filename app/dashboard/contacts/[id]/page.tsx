import { redirect, notFound } from "next/navigation";
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

  // Parallel reads: contact + related lists in one round-trip group.
  // Related tables always scoped by organization_id (defense in depth).
  const [contactRes, stagesRes, activityRes, bookingsRes, notesRes] =
    await Promise.all([
      admin
        .from("contacts")
        .select(
          "id, email, first_name, last_name, phone, status, source, tags, last_contacted_at, created_at, pipeline_stage_id",
        )
        .eq("id", id)
        .eq("organization_id", orgId)
        .maybeSingle(),
      admin
        .from("pipeline_stages")
        .select("id, name, slug, position, is_won, is_lost")
        .eq("organization_id", orgId)
        .order("position", { ascending: true }),
      admin
        .from("email_activity")
        .select(
          "id, direction, subject, from_email, to_email, status, created_at",
        )
        .eq("organization_id", orgId)
        .eq("contact_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("bookings")
        .select("id, title, starts_at, status")
        .eq("organization_id", orgId)
        .eq("contact_id", id)
        .order("starts_at", { ascending: false })
        .limit(20),
      admin
        .from("contact_notes")
        .select("id, body, created_at, created_by")
        .eq("organization_id", orgId)
        .eq("contact_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const contact = contactRes.data;
  if (!contact) notFound();

  return (
    <ContactDetailClient
      organizationId={orgId}
      contact={contact}
      stages={stagesRes.data ?? []}
      activity={activityRes.data ?? []}
      bookings={bookingsRes.data ?? []}
      notes={notesRes.data ?? []}
    />
  );
}
