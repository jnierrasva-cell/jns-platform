export function isOrgManagerRole(role: string | null | undefined): boolean {
  return role === "ceo" || role === "admin";
}

/** Roles that may be assigned through team invites (never owner/ceo). */
export const INVITE_ROLES = ["admin", "assistant", "member"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export function isInviteRole(role: unknown): role is InviteRole {
  return (
    typeof role === "string" &&
    (INVITE_ROLES as readonly string[]).includes(role)
  );
}

/** Paths only managers should use (keep in sync with middleware + sidebar). */
export const MANAGER_ONLY_PATH_PREFIXES = [
  "/dashboard/automation",
  "/dashboard/email-rules",
  "/dashboard/templates",
  "/dashboard/integrations",
  "/dashboard/team",
] as const;
