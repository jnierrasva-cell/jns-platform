import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminClient } from "@/components/admin-client";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Platform administration");

async function assertPlatformAdmin(
  userId: string,
  email: string | null | undefined,
) {
  if (email?.toLowerCase() === "j.nierras.va@gmail.com") return true;

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

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const allowed = await assertPlatformAdmin(user.id, user.email);
  if (!allowed) redirect("/dashboard");

  let profiles: {
    id: string;
    email: string | null;
    business_name: string | null;
    role: string;
    status: string;
    created_at: string;
  }[] = [];
  let organizations: {
    id: string;
    name: string | null;
    slug: string | null;
    plan: string | null;
    billing_status: string | null;
    billing_provider: string | null;
    plan_period_end: string | null;
    plan_notes: string | null;
  }[] = [];
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
    else organizations = orgs ?? [];
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