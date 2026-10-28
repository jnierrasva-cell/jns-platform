export function safeNextPath(raw, origin = "https://jns.invalid") {
  if (
    !raw ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\")
  ) {
    return null;
  }

  const nextUrl = new URL(raw, origin);
  if (nextUrl.origin !== origin) return null;

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}
