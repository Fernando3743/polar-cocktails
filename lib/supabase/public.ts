import { createClient as createAnonClient } from "@supabase/supabase-js";

/**
 * Cookieless anon client for public reads (catalog, site config). These reads
 * are identical for every visitor, so they run without cookies/session — which
 * is required because `unstable_cache` callbacks must not access request-scoped
 * data such as cookies(). Only constructed in DB mode (env vars present).
 */
export function createPublicClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
