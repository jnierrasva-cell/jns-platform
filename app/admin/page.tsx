import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminClient } from "@/components/admin-client";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Platform administration");

async function assertPlatformAdmin(userId: string) {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return profile?.role === "super_admin";
  } catch {
    return false;
  }
}

export type AdminOrgRow = {
  id: string;
  name: string | null;
  slug: string | null;
  plan: string | null;
  billing_status: string | null;
  billing_provider: string | null;
  plan_period_end: string | null;
  plan_notes: string | null;
  owner_email: string | null;
  owner_role: string | null;
  google_connected: boolean;
  google_needs_reauth: boolean;
  google_email: string | null;
  twilio_connected: boolean;
  arketa_location_count: number;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const allowed = await assertPlatformAdmin(user.id);
  if (!allowed) redirect("/dashboard");

  let profiles: {
    id: string;
    email: string | null;
    business_name: string | null;
    role: string;
    status: string;
    created_at: string;
  }[] = [];
  let organizations: AdminOrgRow[] = [];
  let loadError: string | null = null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, business_name, role, status, created_at")
      .order("created_at", { ascending: false });

    if (error) loadError = error.message;
    else profiles = data ?? [];

    const { data: orgs, error: orgError } = await admin
      .from("organizations")
      .select(
        "id, name, slug, plan, billing_status, billing_provider, plan_period_end, plan_notes",
      )
      .order("name", { ascending: true });

    if (orgError && !loadError) loadError = orgError.message;
    else {
      const baseOrgs = orgs ?? [];
      const orgIds = baseOrgs.map((o) => o.id);

      const ownerByOrg = new Map<
        string,
        { email: string | null; role: string }
      >();
      const googleByOrg = new Map<
        string,
        { email: string | null; needs_reauth: boolean }
      >();
      const twilioOrgs = new Set<string>();
      const arketaCount = new Map<string, number>();

      if (orgIds.length > 0) {
        const { data: members } = await admin
          .from("org_members")
          .select("organization_id, role, user_id")
          .in("organization_id", orgIds)
          .in("role", ["ceo", "admin"]);

        const memberUserIds = [
          ...new Set((members ?? []).map((m) => m.user_id as string)),
        ];
        const emailByUser = new Map<string, string | null>();
        if (memberUserIds.length > 0) {
          const { data: memberProfiles } = await admin
            .from("profiles")
            .select("id, email")
            .in("id", memberUserIds);
          for (const p of memberProfiles ?? []) {
            emailByUser.set(p.id, p.email ?? null);
          }
        }

        for (const m of members ?? []) {
          const orgId = m.organization_id as string;
          const role = (m.role as string) || "admin";
          const email = emailByUser.get(m.user_id as string) ?? null;
          const existing = ownerByOrg.get(orgId);
          if (!existing || (role === "ceo" && existing.role !== "ceo")) {
            ownerByOrg.set(orgId, { email, role });
          }
        }

        const { data: googleRows } = await admin
          .from("connections")
          .select("organization_id, connected_email, needs_reauth")
          .in("organization_id", orgIds)
          .eq("provider", "google");
        for (const g of googleRows ?? []) {
          googleByOrg.set(g.organization_id as string, {
            email: (g.connected_email as string | null) ?? null,
            needs_reauth: Boolean(g.needs_reauth),
          });
        }

        const { data: twilioRows } = await admin
          .from("twilio_connections")
          .select("organization_id")
          .in("organization_id", orgIds);
        for (const t of twilioRows ?? []) {
          twilioOrgs.add(t.organization_id as string);
        }

        const { data: arketaRows } = await admin
          .from("arketa_locations")
          .select("organization_id")
          .in("organization_id", orgIds);
        for (const a of arketaRows ?? []) {
          const id = a.organization_id as string;
          arketaCount.set(id, (arketaCount.get(id) ?? 0) + 1);
        }
      }

      organizations = baseOrgs.map((o) => {
        const owner = ownerByOrg.get(o.id);
        const google = googleByOrg.get(o.id);
        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          plan: o.plan,
          billing_status: o.billing_status,
          billing_provider: o.billing_provider,
          plan_period_end: o.plan_period_end,
          plan_notes: o.plan_notes,
          owner_email: owner?.email ?? null,
          owner_role: owner?.role ?? null,
          google_connected: Boolean(google),
          google_needs_reauth: Boolean(google?.needs_reauth),
          google_email: google?.email ?? null,
          twilio_connected: twilioOrgs.has(o.id),
          arketa_location_count: arketaCount.get(o.id) ?? 0,
        };
      });
    }
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Could not create admin client (check SUPABASE_SERVICE_ROLE_KEY)";
  }

  if (loadError) {
    return (
      <div className="min-h-full bg-zinc-50 px-6 py-10 text-zinc-900">
        <h1 className="text-2xl font-semibold">JNS Admin</h1>
        <p className="mt-4 text-sm text-red-600">{loadError}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Confirm service role key and plan columns on organizations.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 px-6 py-10 text-zinc-900">
      <AdminClient profiles={profiles} organizations={organizations} />
    </div>
  );
}
