import { redirect } from "next/navigation";

export default async function ResetPasswordAlias({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (value) {
      value.forEach((item) => params.append(key, item));
    }
  }

  const query = params.toString();
  redirect(`/auth/reset-password${query ? `?${query}` : ""}`);
}
