import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route, but double-checking here keeps
  // this page safe even if it's ever reached another way.
  if (!user) {
    redirect("/login");
  }

  return <DashboardClient userEmail={user.email ?? ""} />;
}