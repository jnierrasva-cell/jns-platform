import { createClient } from "@/lib/supabase/server";
import { IntegrationsClient } from "@/components/integrations-client";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("org_members")
    .select("role, organization_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: googleConnection } = await supabase
    .from("connections")
    .select("connected_email, created_at")
    .eq("organization_id", membership!.organization_id)
    .eq("provider", "google")
    .maybeSingle();

  return (
    <IntegrationsClient
      orgId={membership!.organization_id}
      isOrgCeo={membership?.role === "ceo"}
      googleConnection={googleConnection ?? null}
      statusParam={
        params.google_connected ? "connected" : params.google_error ?? null
      }
    />
  );
}