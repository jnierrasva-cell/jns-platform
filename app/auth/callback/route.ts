import { createClient } from "@/lib/supabase/server";
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
        .select("account_type, status")
        .eq("id", user.id)
        .maybeSingle();

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