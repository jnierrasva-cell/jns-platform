import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FinancialAccessRole = "none" | "view" | "edit";

export type FinancialAccess = {
  allowed: boolean;
  canEdit: boolean;
  isCeo: boolean;
  role: FinancialAccessRole;
};

/**
 * Resolve Financials access for the current user in an organization.
 * CEO always has full edit access. Others need workspace_financial_access.
 */
export async function getFinancialAccess(
  organizationId: string,
  userId: string,
  orgRole?: string | null,
): Promise<FinancialAccess> {
  if (orgRole === "ceo") {
    return { allowed: true, canEdit: true, isCeo: true, role: "edit" };
  }

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("workspace_financial_access")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return { allowed: false, canEdit: false, isCeo: false, role: "none" };
    }

    const role = data.role === "edit" ? "edit" : "view";
    return {
      allowed: true,
      canEdit: role === "edit",
      isCeo: false,
      role,
    };
  } catch {
    const supabase = await createClient();
    const { data } = await supabase
      .from("workspace_financial_access")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return { allowed: false, canEdit: false, isCeo: false, role: "none" };
    }

    const role = data.role === "edit" ? "edit" : "view";
    return {
      allowed: true,
      canEdit: role === "edit",
      isCeo: false,
      role,
    };
  }
}

/** Whether the shell should show the Financials nav item. */
export async function userCanSeeFinancials(
  organizationId: string,
  userId: string,
  orgRole?: string | null,
): Promise<boolean> {
  const access = await getFinancialAccess(organizationId, userId, orgRole);
  return access.allowed;
}
