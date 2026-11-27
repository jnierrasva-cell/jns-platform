import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveOrg } from "@/lib/org/active";
import { ContactsClient } from "@/components/contacts-client";

const PAGE_SIZE = 100;
const MAX_PAGE = 500;

function buildContactsHref(input: {
  page?: number;
  q?: string;
  stage?: string;
}) {
  const params = new URLSearchParams();
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.stage && input.stage !== "all") params.set("stage", input.stage);
  const qs = params.toString();
  return qs ? `/dashboard/contacts?${qs}` : "/dashboard/contacts";
}

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
    const safe = q.replace(/[%_,.()]/g, " ").trim();
    if (safe) {
      const pattern = `%${safe}%`;
      contactsQuery = contactsQuery.or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`,
      );
    }
  }

  const [contactsRes, stagesRes, googleRes, twilioRes] = await Promise.all([
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
  ]);

  const loadError = contactsRes.error?.message || stagesRes.error?.message || null;
  const totalCount = contactsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showingFrom = totalCount === 0 ? 0 : from + 1;
  const showingTo = Math.min(from + (contactsRes.data?.length ?? 0), totalCount);

  return (
    <div className="space-y-4">
      {loadError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Could not load clients: {loadError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          {totalCount === 0
            ? "No clients match this view"
            : `Showing ${showingFrom}–${showingTo} of ${totalCount}`}
          {q ? ` · Search “${q}”` : ""}
          {stage !== "all" ? " · Filtered by stage" : ""}
        </p>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={buildContactsHref({ page: page - 1, q, stage })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-xl border border-slate-100 px-3 py-1.5 text-slate-300">
                Previous
              </span>
            )}
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildContactsHref({ page: page + 1, q, stage })}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-xl border border-slate-100 px-3 py-1.5 text-slate-300">
                Next
              </span>
            )}
          </div>
        ) : null}
      </div>

      <ContactsClient
        organizationId={orgId}
        contacts={contactsRes.data ?? []}
        stages={stagesRes.data ?? []}
        googleConnected={Boolean(googleRes.data)}
        twilioConnected={Boolean(twilioRes.data)}
      />

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2 pb-4">
          {page > 1 ? (
            <Link
              href={buildContactsHref({ page: page - 1, q, stage })}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Previous page
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={buildContactsHref({ page: page + 1, q, stage })}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Next page
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
