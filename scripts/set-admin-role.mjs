// Service-role helper to set a user's admin role claim (app_metadata.role).
//
// Usage:
//   node --env-file=.env.local scripts/set-admin-role.mjs <email> <admin|super_admin>
//
// Use this to (1) give the owner the 'super_admin' claim, (2) migrate any
// pre-existing admins to 'admin' BEFORE applying migration 0009, and (3) recover
// from a lost claim. Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Note: app_metadata is writable only with the service-role key (not by users),
// which is exactly why it is a trustworthy authorization claim.
import { createClient } from "@supabase/supabase-js";

const [, , email, role] = process.argv;
if (!email || (role !== "admin" && role !== "super_admin")) {
  console.error(
    "Usage: node --env-file=.env.local scripts/set-admin-role.mjs <email> <admin|super_admin>",
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

// Find the user by email, paginating defensively.
const target = email.toLowerCase();
let found = null;
for (let page = 1; page <= 20 && !found; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: 200,
  });
  if (error) {
    console.error("Failed to list users:", error.message);
    process.exit(1);
  }
  found =
    data.users.find((u) => (u.email ?? "").toLowerCase() === target) ?? null;
  if (data.users.length < 200) break;
}

if (!found) {
  console.error(
    `No auth user found with email ${email}. Create it first with scripts/create-admin-user.mjs.`,
  );
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(found.id, {
  app_metadata: { ...found.app_metadata, role },
});
if (error) {
  console.error("Failed to set role:", error.message);
  process.exit(1);
}

console.log(`Set app_metadata.role='${role}' on ${email} (${found.id}).`);
