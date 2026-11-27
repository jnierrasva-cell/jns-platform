import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { ContactsClient } from "@/components/contacts-client";

const PAGE_SIZE = 100;
const MAX_PAGE = 500;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; stage?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const active = await getActiveOrg();
  if (!active) redirect("/onboarding/setup-business");

  const orgId = active.organizationId;
  const admin = createAdminClient();
  const sp = await searchParams;

  const pageRaw = Number.parseInt(sp.page || "1", 10);
  const page = Number.isFinite(pageRaw)
    ? Math.min(Math.max(1, pageRaw), MAX_PAGE)
    : 1;
  const q = (sp.q || "").trim();
  const stage = (sp.stage || "all").trim() || "all";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let contactsQuery = admin
    .from("contacts")
    .select(
      "id, email, first_name, last_name, phone, status, source, tags, last_contacted_at, created_at, pipeline_stage_id",
      { count: "exact" },
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (stage !== "all") {
    contactsQuery = contactsQuery.eq("pipeline_stage_id", stage);
  }

  if (q) {
    // Simple OR search across common fields
    const pattern = `%${q.replace(/[%_,]/g, "")}%`;
    contactsQuery = contactsQuery.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
    );
  }

  // Parallel reads — cuts sequential layout lag on this route.
  const [contactsRes, stagesRes, googleRes, twilioRes, stageCountsRes] =
    await Promise.all([
      contactsQuery,
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
      admin
        .from("contacts")
        .select("pipeline_stage_id")
        .eq("organization_id", orgId)
        .not("pipeline_stage_id", "is", null)
        .limit(5000),
    ]);

  const loadError =
    contactsRes.error?.message ||
    stagesRes.error?.message ||
    null;

  const totalCount = contactsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Approximate stage chip counts from a capped sample (exact all-time counts
  // would need a group-by RPC; good enough for navigation chips).
  const stageCountMap: Record<string, number> = {};
  for (const row of stageCountsRes.data ?? []) {
    const id = row.pipeline_stage_id as string | null;
    if (!id) continue;
    stageCountMap[id] = (stageCountMap[id] ?? 0) + 1;
  }

  return (
    <ContactsClient
      organizationId={orgId}
      contacts={contactsRes.data ?? []}
      stages={stagesRes.data ?? []}
      googleConnected={Boolean(googleRes.data)}
      twilioConnected={Boolean(twilioRes.data)}
      totalCount={totalCount}
      page={page}
      pageSize={PAGE_SIZE}
      totalPages={totalPages}
      initialQuery={q}
      initialStage={stage}
      stageCounts={stageCountMap}
      loadError={loadError}
    />
  );
}
