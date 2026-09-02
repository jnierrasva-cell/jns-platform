import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("google_oauth_state")?.value;
  const redirectUri = `${request.nextUrl.origin}/api/google/callback`;

  function redirectWithParam(key: string, value: string) {
    const url = new URL("/dashboard", request.url);
    url.searchParams.set(key, value);
    const res = NextResponse.redirect(url);
    res.cookies.delete("google_oauth_state");
    return res;
  }

  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithParam("google_error", "invalid_state");
  }

  // Exchange the authorization code for real tokens.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return redirectWithParam("google_error", "token_exchange_failed");
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in, scope } = tokens;

  // Look up which Gmail address was actually connected.
  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${access_token}` } },
  );
  const googleUser = userInfoRes.ok ? await userInfoRes.json() : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(
      new URL("/onboarding/setup-business", request.url),
    );
  }

  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  const { error } = await supabase.from("connections").upsert(
    {
      organization_id: membership.organization_id,
      provider: "google",
      connected_email: googleUser?.email ?? null,
      access_token,
      refresh_token,
      expires_at: expiresAt,
      scopes: scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,provider" },
  );

  if (error) {
    return redirectWithParam("google_error", "save_failed");
  }

  return redirectWithParam("google_connected", "1");
}