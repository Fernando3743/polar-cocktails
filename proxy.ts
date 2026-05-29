import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed the `middleware` convention to `proxy`.
export async function proxy(request: NextRequest) {
  // Without a database the storefront runs fully unauthenticated.
  if (!hasSupabaseEnv()) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - image files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
