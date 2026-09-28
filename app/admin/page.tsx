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

export default async function AdminPage() {
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

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, business_name, role, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-full bg-zinc-50 px-6 py-10 text-zinc-900">
        <p className="text-sm text-red-600">
          Could not load users: {error.message}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Check SUPABASE_SERVICE_ROLE_KEY on Vercel Production, then redeploy.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <AdminClient profiles={profiles ?? []} />
    </div>
  );
}