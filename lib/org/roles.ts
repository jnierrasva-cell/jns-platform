export function isOrgManagerRole(role: string | null | undefined): boolean {
  return role === "ceo" || role === "admin";
}

/** Paths only managers should use (keep in sync with middleware + sidebar). */
export const MANAGER_ONLY_PATH_PREFIXES = [
  "/dashboard/automation",
  "/dashboard/email-rules",
  "/dashboard/templates",
  "/dashboard/integrations",
  "/dashboard/team",
] as const;
