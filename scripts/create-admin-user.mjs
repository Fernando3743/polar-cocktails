// One-off helper to create a Supabase admin auth user (no CLI is wired up).
//
// Usage:
//   node --env-file=.env.local scripts/create-admin-user.mjs <email> <password>
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the env file.
// The user is created already email-confirmed so it can sign in immediately.
// Afterwards, add the email to ADMIN_EMAIL in .env.local (comma-separated for
// multiple admins) so it passes requireAdmin(), then restart the server.
import { createClient } from "@supabase/supabase-js";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error(
    "Usage: node --env-file=.env.local scripts/create-admin-user.mjs <email> <password>",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Pass --env-file=.env.local.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

console.log(`Created admin user: ${data.user.email} (${data.user.id})`);
console.log(
  "Next: add this email to ADMIN_EMAIL in .env.local, then restart the server.",
);
