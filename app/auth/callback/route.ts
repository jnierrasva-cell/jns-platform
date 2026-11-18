import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { needsProfileName } from "@/lib/names";
import { safeNextPath } from "@/lib/auth/redirect.mjs";
import { NextResponse, type NextRequest } from "next/server";

/**
 * OAuth / magic-link callback.
 * Session cookies must be written onto the *redirect* response — otherwise
 * the browser lands authenticated nowhere and public routes (e.g. /) look
 * like a failed login.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"), url.origin);

  const origin = resolveOrigin(request);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  // Build the final redirect later; collect auth cookies here first.
  const cookieJar: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieJar.push({ name, value, options: options ?? {} });
          });
        },
      },
    },
  );

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "Could not exchange the authentication callback code.",
      exchangeError,
    );
    return withCookies(
      NextResponse.redirect(`${origin}/login?error=auth_callback`),
      cookieJar,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return withCookies(
      NextResponse.redirect(`${origin}/login?error=auth_callback`),
      cookieJar,
    );
  }

  // Ensure a profiles row exists (trigger may lag on brand-new OAuth users).
  let { data: profile } = await supabase
    .from("profiles")
    .select("account_type, status, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const admin = createAdminClient();
    const meta = user.user_metadata ?? {};
    const { given, family } = namesFromMetadata(meta, user.email);
    const { error: upsertError } = await admin.from("profiles").upsert(
      {
        id: user.id,
        first_name: given || null,
        last_name: family || null,
        status: "approved",
      },
      { onConflict: "id" },
    );
    if (upsertError) {
      console.error("[auth/callback] profile bootstrap failed", upsertError);
    }
    const { data: created } = await supabase
      .from("profiles")
      .select("account_type, status, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    profile = created;
  }

  const meta = user.user_metadata ?? {};
  const { given: firstName, family: lastName } = namesFromMetadata(
    meta,
    user.email,
  );

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

    if (nameError) {
      console.error("[auth/callback] profile name update failed", nameError);
    } else if (!namedProfile) {
      console.error("[auth/callback] profile not found after name update");
    }
  }

  if (profile?.status === "rejected") {
    return withCookies(
      NextResponse.redirect(`${origin}/pending-approval`),
      cookieJar,
    );
  }

  if (profile && profile.status !== "approved") {
    await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", user.id);
  }

  // Invite return path always wins when present.
  if (nextPath?.startsWith("/invite/")) {
    return withCookies(
      NextResponse.redirect(new URL(nextPath, origin)),
      cookieJar,
    );
  }

  if (!profile?.account_type) {
    return withCookies(
      NextResponse.redirect(`${origin}/onboarding/account-type`),
      cookieJar,
    );
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    if (profile.account_type === "business") {
      return withCookies(
        NextResponse.redirect(`${origin}/onboarding/setup-business`),
        cookieJar,
      );
    }
    return withCookies(
      NextResponse.redirect(`${origin}/onboarding/account-type`),
      cookieJar,
    );
  }

  if (nextPath) {
    return withCookies(
      NextResponse.redirect(new URL(nextPath, origin)),
      cookieJar,
    );
  }

  // Existing member with a workspace → dashboard (never public /).
  return withCookies(
    NextResponse.redirect(`${origin}/dashboard`),
    cookieJar,
  );
}

function resolveOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost && process.env.NODE_ENV !== "development") {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return request.nextUrl.origin;
}

function withCookies(
  response: NextResponse,
  cookieJar: {
    name: string;
    value: string;
    options: Record<string, unknown>;
  }[],
) {
  for (const { name, value, options } of cookieJar) {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2],
    );
  }
  return response;
}

/** Google uses given_name / family_name; email signup uses first_name / last_name. */
function namesFromMetadata(
  meta: Record<string, unknown>,
  email?: string | null,
): { given: string; family: string } {
  const given =
    str(meta.first_name) ||
    str(meta.given_name) ||
    str(meta.name)?.split(/\s+/)[0] ||
    "";
  const family =
    str(meta.last_name) ||
    str(meta.family_name) ||
    str(meta.name)?.split(/\s+/).slice(1).join(" ") ||
    "";
  if (given || family) return { given, family };
  const local = email?.split("@")[0]?.trim() || "";
  return { given: local, family: "" };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
