import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { needsProfileName } from "@/lib/names";
import { safeNextPath } from "@/lib/auth/redirect.mjs";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = safeNextPath(searchParams.get("next"), origin);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "Could not exchange the authentication callback code.",
      exchangeError,
    );
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, status, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const firstName =
    typeof user.user_metadata.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "";
  const lastName =
    typeof user.user_metadata.last_name === "string"
      ? user.user_metadata.last_name.trim()
      : "";

  if (
    firstName &&
    lastName &&
    needsProfileName(profile?.first_name, profile?.last_name)
  ) {
    const admin = createAdminClient();
    const { data: namedProfile, error: nameError } = await admin
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (nameError) throw new Error(nameError.message);
    if (!namedProfile) throw new Error("User profile not found.");
  }

  if (profile?.status === "rejected") {
    return NextResponse.redirect(`${origin}/pending-approval`);
  }

  if (profile && profile.status !== "approved") {
    await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", user.id);
  }

  if (nextPath?.startsWith("/invite/")) {
    return NextResponse.redirect(new URL(nextPath, origin));
  }

  if (!profile?.account_type) {
    return NextResponse.redirect(`${origin}/onboarding/account-type`);
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    if (profile.account_type === "business") {
      return NextResponse.redirect(`${origin}/onboarding/setup-business`);
    }
    return NextResponse.redirect(`${origin}/onboarding/account-type`);
  }

  if (nextPath) return NextResponse.redirect(new URL(nextPath, origin));

  return NextResponse.redirect(`${origin}/dashboard`);
}