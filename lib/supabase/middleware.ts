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

  // Mirror requireAdmin() (lib/auth.ts): a user is an admin when authenticated
  // and either ADMIN_EMAIL is unset/empty or their email is in it (ADMIN_EMAIL
  // may be a single email or a comma-separated allowlist). Gating both redirects
  // on isAdmin (not mere authentication) keeps the edge consistent with the shell
  // layout and avoids a login<->/admin redirect loop for a non-admin. Parsed
  // inline (not imported from lib/auth) so this edge middleware stays free of
  // server-only modules.
  const adminAllowlist = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
  const userEmail = user?.email?.toLowerCase() ?? "";
  const isAdmin =
    !!user &&
    (adminAllowlist.length === 0 || adminAllowlist.includes(userEmail));

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
