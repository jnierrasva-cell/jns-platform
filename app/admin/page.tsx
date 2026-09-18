import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminClient } from "@/components/admin-client";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Auth check with the signed-in user
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/dashboard");

  // List ALL users with service role (bypasses RLS)
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, business_name, role, status, created_at")
    .order("created_at", { ascending: false });

  return <AdminClient profiles={profiles ?? []} />;
}