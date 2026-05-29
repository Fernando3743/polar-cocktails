/**
 * True only when both the Supabase URL and anon key are present and non-empty.
 * When false, the app runs in seed/demo mode (no database, no auth).
 */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
