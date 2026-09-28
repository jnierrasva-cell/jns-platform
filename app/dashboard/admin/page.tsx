import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminClient } from "@/components/admin-client";

function isPlatformOwner(
  role: string | null | undefined,
  email: string | null | undefined,
) {
  return (
    role === "super_admin" ||
    email?.toLowerCase() === "j.nierras.va@gmail.com"
  );
}

export default async function DashboardAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isPlatformOwner(profile?.role, user.email)) {
    redirect("/dashboard");
  }

  let profiles: {
    id: string;
    email: string | null;
    business_name: string | null;
    role: string;
    status: string;
    created_at: string;
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
  } catch (err) {
    loadError =
      err instanceof Error
        ? err.message
        : "Could not create admin client (check SUPABASE_SERVICE_ROLE_KEY)";
  }

  if (loadError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">JNS Admin</h1>
        <p className="mt-4 text-sm text-red-600">{loadError}</p>
        <p className="mt-2 text-xs text-zinc-500">
          In Vercel → Environment Variables, confirm{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> is set for Production, then
          Redeploy.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          ← Back to overview
        </Link>
      </div>
    );
  }

  return <AdminClient profiles={profiles} />;
}