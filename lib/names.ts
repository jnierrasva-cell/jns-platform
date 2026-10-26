/**
 * Singular possessive workspace title (consistent 's).
 * Cheska → Cheska's workspace | James → James's workspace
 */
export function possessiveWorkspaceName(firstName: string): string {
  const raw = firstName.trim().replace(/\s+/g, " ");
  if (!raw) return "My workspace";
  const name = raw
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
  return `${name}'s workspace`;
}

export function displayPersonName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string | null,
): string {
  const full = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  if (full) return full;
  if (email?.trim()) return email.trim();
  return "User";
}

export function needsProfileName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): boolean {
  return !firstName?.trim() || !lastName?.trim();
}