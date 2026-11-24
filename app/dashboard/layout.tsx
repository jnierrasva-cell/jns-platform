import { createNoIndexMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/dashboard-shell";
import { getActiveOrg } from "@/lib/org/active";
import { getPlanGateState } from "@/lib/billing/org-plan";
import {
  PLAN_LIMITS,
  daysRemaining,
  isTrialing,
} from "@/lib/billing/plans";
import { needsProfileName } from "@/lib/names";
import { CompleteProfileBanner } from "@/components/complete-profile-banner";
import { TrialBanner } from "@/components/trial-banner";
import { ArketaSyncAlertBanner } from "@/components/arketa-sync-alert-banner";

export const metadata = createNoIndexMetadata("Workspace");

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileRes, membershipsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "role, status, account_type, active_organization_id, first_name, last_name",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("org_members")
      .select("organization_id, role")
      .eq("user_id", user.id),
  ]);

  const profile = profileRes.data;
  const memberships = membershipsRes.data;

  if (profile?.status === "rejected") {
    redirect("/pending-approval");
  }

  const hasMembership = (memberships?.length ?? 0) > 0;

  if (profile) {
    const nextStatus = "approved";
    const nextAccountType = profile.account_type ?? "individual";
    const nextActiveOrg =
      profile.active_organization_id ??
      memberships?.[0]?.organization_id ??
      null;

    const needsWrite =
      profile.status !== nextStatus ||
      (profile.account_type ?? null) !== nextAccountType ||
      (profile.active_organization_id ?? null) !== nextActiveOrg;

    if (needsWrite) {
      try {
        await supabase
          .from("profiles")
          .update({
            status: nextStatus,
            account_type: nextAccountType,
            active_organization_id: nextActiveOrg,
          })
          .eq("id", user.id);
      } catch {
        // ignore
      }
    }
  }

  if (!hasMembership) {
    if (profile?.account_type === "business") {
      redirect("/onboarding/setup-business");
    }
    redirect("/onboarding/account-type");
  }

  let active = await getActiveOrg();

  if (!active && memberships?.[0]) {
    try {
      await supabase
        .from("profiles")
        .update({
          status: "approved",
          active_organization_id: memberships[0].organization_id,
          account_type: profile?.account_type ?? "individual",
        })
        .eq("id", user.id);
    } catch {
      // ignore
    }
    active = await getActiveOrg();
  }

  if (!active) {
    redirect("/onboarding/account-type");
  }

  const activeOrg = active;
  const organizationId = activeOrg.organizationId;
  const isOrgManager =
    activeOrg.role === "ceo" || activeOrg.role === "admin";

  let platformRole = profile?.role ?? null;
  let firstName = profile?.first_name;
  let lastName = profile?.last_name;

  type ArketaIssue = {
    id: string;
    label: string;
    last_sync_status: string | null;
    last_sync_error: string | null;
    consecutive_failures: number;
  };

  const [adminProfileResult, gate, arketaIssues] = await Promise.all([
    (async () => {
      try {
        const admin = createAdminClient();
        const { data: adminProfile, error: adminProfileError } = await admin
          .from("profiles")
          .select("role, first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();
        if (adminProfileError) {
          console.error(
            "Could not read the user's dashboard profile.",
            adminProfileError,
          );
          return null;
        }
        return adminProfile;
      } catch (error) {
        console.error("Could not load the user's dashboard profile.", error);
        return null;
      }
    })(),
    getPlanGateState(organizationId),
    (async (): Promise<ArketaIssue[]> => {
      if (!isOrgManager) return [];
      try {
        const admin = createAdminClient();
        const { data: rows } = await admin
          .from("arketa_locations")
          .select(
            "id, label, last_sync_status, last_sync_error, consecutive_failures",
          )
          .eq("organization_id", organizationId);

        return (rows ?? [])
          .filter((r) => {
            const status = String(r.last_sync_status || "").toLowerCase();
            const fails = Number(r.consecutive_failures ?? 0);
            return status === "error" || fails >= 2;
          })
          .map((r) => ({
            id: r.id as string,
            label: r.label as string,
            last_sync_status: (r.last_sync_status as string | null) ?? null,
            last_sync_error: (r.last_sync_error as string | null) ?? null,
            consecutive_failures: Number(r.consecutive_failures ?? 0),
          }));
      } catch {
        return [];
      }
    })(),
  ]);

  if (adminProfileResult) {
    if (adminProfileResult.role) platformRole = adminProfileResult.role;
    firstName = adminProfileResult.first_name;
    lastName = adminProfileResult.last_name;
  }

  const isPlatformAdmin =
    platformRole === "super_admin" ||
    user.email?.toLowerCase() === "j.nierras.va@gmail.com";

  const planLabel = isTrialing(gate.billing)
    ? "Pro trial"
    : PLAN_LIMITS[gate.planId].label;
  const planId = gate.planId;
  const trialActive = isTrialing(gate.billing);
  const trialExpired =
    (gate.billing.billing_status || "").toLowerCase() === "expired" &&
    (gate.billing.billing_provider || "").toLowerCase() === "jns_trial";
  const remaining = daysRemaining(gate.billing);
  const endsLabel =
    gate.billing.plan_period_end &&
    !Number.isNaN(new Date(gate.billing.plan_period_end).getTime())
      ? new Date(gate.billing.plan_period_end).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const metadataFirstName =
    typeof user.user_metadata.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "";
  const metadataLastName =
    typeof user.user_metadata.last_name === "string"
      ? user.user_metadata.last_name.trim()
      : "";
  const showNamePrompt = needsProfileName(
    firstName?.trim() || metadataFirstName,
    lastName?.trim() || metadataLastName,
  );

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      isPlatformAdmin={isPlatformAdmin}
      isOrgManager={isOrgManager}
      orgName={activeOrg.orgName}
      orgKind={activeOrg.orgKind}
      orgLogoUrl={activeOrg.orgLogoUrl}
      planLabel={planLabel}
      planId={planId}
      contactLabelPlural={activeOrg.contactLabelPlural}
    >
      <>
        {showNamePrompt && <CompleteProfileBanner />}
        {(trialActive || trialExpired) && remaining !== null && (
          <TrialBanner daysLeft={remaining} endsLabel={endsLabel} />
        )}
        {isOrgManager && <ArketaSyncAlertBanner issues={arketaIssues} />}
        {children}
      </>
    </DashboardShell>
  );
}
