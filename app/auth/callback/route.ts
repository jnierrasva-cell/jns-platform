import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { needsProfileName } from "@/lib/names";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
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

      if (profile && profile.status !== "approved") {
        await supabase
          .from("profiles")
          .update({ status: "approved" })
          .eq("id", user.id);
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
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}