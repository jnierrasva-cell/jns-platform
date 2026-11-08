import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActiveOrg } from "@/lib/org/resolve-active-org";

export type ActiveOrg = {
  organizationId: string;
  role: string;
  orgName: string;
  orgKind: "personal" | "business";
  orgLogoUrl: string | null;
  niche: string | null;
  contactLabel: string;
  contactLabelPlural: string;
};

export async function getActiveOrg(): Promise<ActiveOrg | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (!memberships?.length) return null;

  // Read-only cookie access is allowed in Server Components
  const jar = await cookies();
  const cookieOrgId = jar.get("jns_active_org")?.value ?? null;

  let profileActiveId: string | null = null;
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("active_organization_id")
      .eq("id", user.id)
      .maybeSingle();
    profileActiveId =
      (profile?.active_organization_id as string | null) ?? null;
  } catch {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", user.id)
      .maybeSingle();
    profileActiveId =
      (profile?.active_organization_id as string | null) ?? null;
  }

  const selected = resolveActiveOrg({
    memberships: memberships.map((m) => ({
      organization_id: m.organization_id,
      role: m.role as string,
    })),
    cookieOrgId,
    profileActiveId,
  });

  if (!selected) return null;

  // Align profile only — do NOT cookies().set() here (crashes Server Components)
  if (profileActiveId !== selected.organization_id) {
    try {
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ active_organization_id: selected.organization_id })
        .eq("id", user.id);
    } catch {
      await supabase
        .from("profiles")
        .update({ active_organization_id: selected.organization_id })
        .eq("id", user.id);
    }
  }

  let orgName = "Workspace";
  let orgKind: "personal" | "business" = "personal";
  let orgLogoUrl: string | null = null;
  let niche: string | null = null;
  let contactLabel = "Contact";
  let contactLabelPlural = "Contacts";

  try {
    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("name, kind, logo_url, niche, label_map")
      .eq("id", selected.organization_id)
      .maybeSingle();
    orgName = org?.name ?? "Workspace";
    orgKind = org?.kind === "business" ? "business" : "personal";
    orgLogoUrl = org?.logo_url ?? null;
    niche = (org?.niche as string | null) ?? null;
    const map = (org?.label_map ?? {}) as Record<string, string>;
    if (map.contact) contactLabel = map.contact;
    if (map.contacts) contactLabelPlural = map.contacts;
  } catch {
    const { data: org } = await supabase
      .from("organizations")
      .select("name, kind, logo_url")
      .eq("id", selected.organization_id)
      .maybeSingle();
    orgName = org?.name ?? "Workspace";
    orgKind = org?.kind === "business" ? "business" : "personal";
    orgLogoUrl = org?.logo_url ?? null;
  }

  return {
    organizationId: selected.organization_id,
    role: selected.role,
    orgName,
    orgKind,
    orgLogoUrl,
    niche,
    contactLabel,
    contactLabelPlural,
  };
}
