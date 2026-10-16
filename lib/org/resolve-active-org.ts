<<<<<<< HEAD
export function resolveActiveOrg(params: {
  userId: string;
  memberships: { organization_id: string; role: string }[];
  cookieOrgId: string | null;
  profileActiveId: string | null;
}): { organization_id: string; role: string } | null {
  const { memberships, cookieOrgId, profileActiveId } = params;
  if (!memberships || memberships.length === 0) return null;

  // Preference: cookie -> profile
  const preferredId = cookieOrgId || profileActiveId;
  if (preferredId) {
    const m = memberships.find((mm) => mm.organization_id === preferredId);
    if (m) return m;
  }

  // Next: first ceo/admin membership
  const manager = memberships.find((mm) => mm.role === "ceo" || mm.role === "admin");
  if (manager) return manager;

  // Fallback: first membership
  return memberships[0];
}
=======
export type OrgMembership = {
  organization_id: string;
  role: string;
};

/**
 * Shared active-org pick order (must match getActiveOrg + proxy):
 * 1. cookie jns_active_org (if user is a member of that org)
 * 2. profiles.active_organization_id (if member)
 * 3. first membership with role ceo or admin
 * 4. first membership
 */
export function resolveActiveOrg(params: {
  memberships: OrgMembership[];
  cookieOrgId: string | null;
  profileActiveId: string | null;
}): OrgMembership | null {
  const { memberships, cookieOrgId, profileActiveId } = params;
  if (!memberships.length) return null;

  if (cookieOrgId) {
    const fromCookie = memberships.find(
      (m) => m.organization_id === cookieOrgId,
    );
    if (fromCookie) return fromCookie;
  }

  if (profileActiveId) {
    const fromProfile = memberships.find(
      (m) => m.organization_id === profileActiveId,
    );
    if (fromProfile) return fromProfile;
  }

  const manager = memberships.find(
    (m) => m.role === "ceo" || m.role === "admin",
  );
  if (manager) return manager;

  return memberships[0] ?? null;
}
>>>>>>> 02a7af4 (fix roles)
