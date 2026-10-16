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
