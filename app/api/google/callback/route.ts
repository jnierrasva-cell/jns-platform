import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("google_oauth_state")?.value;
  const storedOrgId = request.cookies.get("google_oauth_org")?.value;
  const redirectUri = `${request.nextUrl.origin}/api/google/callback`;

  function redirectWithParam(key: string, value: string) {
    const url = new URL("/dashboard/integrations", request.url);
    url.searchParams.set(key, value);
    const res = NextResponse.redirect(url);
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("google_oauth_org");
    return res;
  }

  if (!code || !state || !storedState || state !== storedState) {
    return redirectWithParam("google_error", "invalid_state");
  }

  if (!storedOrgId) {
    return redirectWithParam("google_error", "missing_org");
  }

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

  if (!access_token) {
    return redirectWithParam("google_error", "token_exchange_failed");
  }

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

  // Must be manager of the org we started connect for
  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("organization_id", storedOrgId)
    .maybeSingle();

  if (
    !membership ||
    !["ceo", "admin"].includes(membership.role)
  ) {
    return redirectWithParam("google_error", "not_allowed");
  }

  const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

  const admin = createAdminClient();
  const { error } = await admin.from("connections").upsert(
    {
      organization_id: storedOrgId,
      provider: "google",
      connected_email: googleUser?.email ?? null,
      access_token,
      refresh_token: refresh_token ?? null,
      expires_at: expiresAt,
      scopes: scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,provider" },
  );

  if (error) {
    return redirectWithParam("google_error", "save_failed");
  }

  return redirectWithParam("google_connected", "1");
}
