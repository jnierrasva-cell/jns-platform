export function matchesInviteEmail(invitedEmail, authenticatedEmail) {
  if (
    typeof invitedEmail !== "string" ||
    typeof authenticatedEmail !== "string"
  ) {
    return false;
  }

  const invited = invitedEmail.trim().toLowerCase();
  const authenticated = authenticatedEmail.trim().toLowerCase();
  return (
    invited.length > 0 &&
    authenticated.length > 0 &&
    invited === authenticated
  );
}
