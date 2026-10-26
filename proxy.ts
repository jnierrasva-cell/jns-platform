import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveActiveOrg } from "@/lib/org/resolve-active-org";
import { isOrgManagerRole } from "@/lib/org/roles";

/** Workspace tools only ceo/admin should open (URL bar included). */
const MANAGER_PREFIXES = [
  "/dashboard/unmatched",
  "/dashboard/automation",
  "/dashboard/email-rules",
  "/dashboard/templates",
  "/dashboard/integrations",
  "/dashboard/team",
  "/dashboard/billing",
];
function isManagerPath(pathname: string) {
  return MANAGER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isProtectedRoute =
    isDashboardRoute || isAdminRoute || isOnboardingRoute;

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Platform panel: only super_admin (not org "admin")
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

  // Platform panel: only super_admin (or founder email)
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const allowed =
      profile?.role === "super_admin" ||
      user.email?.toLowerCase() === "j.nierras.va@gmail.com";

    if (!allowed) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
      }
     }
    }
  // Org manager-only tools — SAME priority as getActiveOrg
  if (user && isManagerPath(pathname)) {
    const cookieOrgId =
      request.cookies.get("jns_active_org")?.value ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", user.id)
      .maybeSingle();

    const profileActiveId =
      (profile?.active_organization_id as string | null) ?? null;

    const { data: memberships } = await supabase
      .from("org_members")
      .select("organization_id, role")
      .eq("user_id", user.id);

    const selected = resolveActiveOrg({
      memberships: (memberships ?? []).map((m) => ({
        organization_id: m.organization_id,
        role: m.role as string,
      })),
      cookieOrgId,
      profileActiveId,
    });

    if (!selected || !isOrgManagerRole(selected.role)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding/:path*"],
};