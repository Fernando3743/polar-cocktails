import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session and guards the admin area.
 * Only called when hasSupabaseEnv() is true (see root middleware.ts).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin") && !isLoginRoute;

  // Mirror requireAdmin() (lib/auth.ts) using only data already on the user from
  // getUser() (no extra DB read): a user is an admin when they are the configured
  // super admin (SUPER_ADMIN_EMAIL) OR carry app_metadata.role in
  // {admin, super_admin}. Gating both redirects on isAdmin (not mere
  // authentication) keeps the edge consistent with the shell layout and avoids a
  // login<->/admin redirect loop for a non-admin. Parsed inline (not imported
  // from lib/auth) so this edge middleware stays free of server-only modules.
  const superEmail = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const userEmail = user?.email?.toLowerCase() ?? "";
  const role = (user?.app_metadata as { role?: unknown } | undefined)?.role;
  const isAdmin =
    !!user &&
    ((superEmail !== "" && userEmail === superEmail) ||
      role === "admin" ||
      role === "super_admin");

  if (isAdminRoute && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // UX-7: an authenticated admin has no reason to see the login page.
  if (isLoginRoute && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
