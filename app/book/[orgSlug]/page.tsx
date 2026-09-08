import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicBookingClient } from "@/components/public-booking-client";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = createAdminClient();

  // organizations need a slug — fallback: match by id if slug column missing
  let org: { id: string; name: string } | null = null;

  const bySlug = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (bySlug.data) {
    org = bySlug.data;
  } else {
    // allow /book/<organization_uuid> during rollout
    const byId = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgSlug)
      .maybeSingle();
    org = byId.data;
  }

  if (!org) notFound();

  return (
    <PublicBookingClient organizationId={org.id} businessName={org.name} />
  );
}