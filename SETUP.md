# Polar — Setup & Handoff

Pixel-perfect landing page + ordering backend + admin for **Polar**, a granizado /
frozen-cocktail shop. Built with **Next.js 16 (App Router) + React 19 + TypeScript +
Tailwind v4 + Supabase**.

The original design lives in `design/PolarUIPrototype.png`.

## Run locally (no database needed)

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

Without Supabase env vars the storefront runs in **demo mode**: the menu comes from
`lib/seed-data.ts`, and checkout still completes (orders are not persisted). This is enough
to demo the whole site.

## Choosing a Supabase connection (cloud vs local)

Next.js only auto-loads `.env.local`, so to switch between the production Supabase project
and a local `supabase start` stack, `.env.local` is a **symlink** that points at one of two
real profile files:

- `.env.cloud` — the production cloud project (publishable + secret keys, `SUPER_ADMIN_EMAIL`,
  and `SUPABASE_DB_PASSWORD` for the CLI).
- `.env.localdb` — a local `supabase start` stack at `http://127.0.0.1:54321` with the fixed
  local-dev keys.

Both files are gitignored (the `.env.*` rule) and hold secrets, so they are never committed.
Switch with the helper scripts, then run the server normally:

```bash
pnpm env:cloud    # point .env.local -> .env.cloud (production)
pnpm env:local    # point .env.local -> .env.localdb (local stack)
pnpm env:which    # show which profile is active
pnpm dev          # uses whichever profile is active (same for build/start)
```

Notes:

- **Edit the profile files** (`.env.cloud` / `.env.localdb`), not `.env.local`. Writing to
  `.env.local` follows the symlink into the active profile, which works but is easy to lose
  track of; `pnpm env:which` tells you which one you are on.
- Leaving `.env.local` absent entirely (delete the symlink) drops back to **demo mode**.
- The local profile needs its own stack running (`supabase start`) plus its own migrations,
  seed, and admin user — it is a separate database from the cloud project.

## Enable real ordering + admin (Supabase)

1. Create a project at https://supabase.com and copy `.env.example` to `.env.local`, filling:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never exposed to the browser; required for admin management)
   - `SUPER_ADMIN_EMAIL` (the owner's email — the single super admin)
2. Run the SQL migrations (in the Supabase SQL editor, **in order** — they are idempotent):
   - `supabase/migrations/0001_init.sql` — tables, enums, indexes, and seeds the 4 categories
     + 6 products.
   - `supabase/migrations/0002_rls.sql` — row-level security + the first `create_order` RPC.
   - `supabase/migrations/0003_inventory.sql` — `sold_out` + optional `stock_qty`, re-issues
     `create_order` with availability checks.
   - `supabase/migrations/0004_promos.sql` — legacy promo setup, kept for historical migration order.
   - `supabase/migrations/0005_order_short_code.sql` — `orders.short_code`; re-issues
     `create_order` to return the `POL-` short code (text, not uuid).
   - `supabase/migrations/0006_review_fixes.sql` — order-integrity + inventory fixes.
   - `supabase/migrations/0007_site_config.sql` — `site_assets` + `shop_settings` tables, RLS,
     and the public Storage buckets for owner-editable images and shop settings.
   - `supabase/migrations/0008_inventory_reactivation_fix.sql` — symmetric stock on cancel/reactivate.
   - `supabase/migrations/0009_admin_rls.sql` — admin-role RLS hardening. Apply only
     after every admin has a role claim (see step 4) or you will lock admins out of the DB.
   - `supabase/migrations/0010_remove_promos.sql` — removes the legacy promo table/RPC/order
     columns and re-issues `create_order` without promo handling. **Apply LAST.**
   - Then run the one-off image backfill from `LAUNCH_RUNBOOK.md` so DB-mode products show the
     real photos instead of the placeholder.
3. **Create the super admin** and disable public sign-ups:
   - In **Supabase → Authentication**, disable public email sign-ups.
   - Create the owner's auth user (or run
     `node --env-file=.env.local scripts/create-admin-user.mjs <email> <password>`), then set
     `SUPER_ADMIN_EMAIL` in `.env.local` to that email. The super admin can never be locked out
     or removed via the UI, and is the only one who sees **Administradores** at `/admin/admins`.
4. **Admin-role rollout (order matters — prevents lockout).** Migration `0009` makes the database
   require an `app_metadata.role` claim for admin access, so set the claims BEFORE applying it:
   1. `node --env-file=.env.local scripts/set-admin-role.mjs <super-email> super_admin`
   2. For each pre-existing admin: `node --env-file=.env.local scripts/set-admin-role.mjs <email> admin`
   3. Verify everyone can still log in and use `/admin`.
   4. Apply `supabase/migrations/0009_admin_rls.sql`, then `supabase/migrations/0010_remove_promos.sql`.
   After that, the super admin creates new admins in-app at `/admin/admins` (email + password) —
   no env edits, no redeploy. Regular admins manage the catalog, orders, settings, and
   multimedia, but not other admins.
5. Restart `pnpm dev`. The menu loads from the database, orders persist, and `/admin` lets you
   manage products/prices/categories, settings/multimedia, order status, and (super admin only)
   admins.

## What still needs the client's input

- **WhatsApp number & Maps link** — placeholders in `lib/config.ts`
  (`WHATSAPP_NUMBER`, `MAPS_URL`). Replace with the real number/location.
- **Real photos** — the cups, hero and Instagram tiles currently use palette-matched
  gradient placeholders (`components/icons/PlaceholderCup.tsx`). To use real photos, set a
  product's `image_url` (admin or DB); product cards/hero automatically prefer the photo
  over the placeholder.

## Key paths

- Storefront sections: `components/sections/*`, product grid `components/menu/*`
- Cart (localStorage): `components/cart/*`
- Checkout + order: `app/checkout`, `app/order/[id]`, action `lib/actions/orders.ts`
- Admin: `app/(admin)/admin/*`
- Theme tokens + global classes (Tailwind v4): `app/globals.css`
- Icons (inline SVG, no emojis): `components/icons/*`

## Production build

```bash
pnpm build && pnpm start
```

## Deploy to Vercel

Hosting is Vercel + Supabase Cloud. Import the repo in Vercel (framework
auto-detected as Next.js), pin the Node version to 20 or 22 in Project Settings ->
General -> Node.js Version, and set the environment variables before the first
deploy. There is no `vercel.json` and no `tailwind.config.ts` to configure
(Tailwind v4 is CSS-first).

### Environment variables

Set these in Project Settings -> Environment Variables:

| Var | Read by the app? | Scope |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes — half of `hasSupabaseEnv()` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes — half of `hasSupabaseEnv()` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes — admin user management (`lib/supabase/admin.ts`) | Production, server only |
| `SUPER_ADMIN_EMAIL` | Yes — identifies the single super admin | Production, server only |
| `NEXT_PUBLIC_SITE_URL` | Yes (metadata/canonical) | Production = real domain |
| `NEXT_PUBLIC_ANALYTICS` | Yes (set to `1` to enable analytics) | Production = `1`; Preview unset |

The two `NEXT_PUBLIC_SUPABASE_*` vars drive demo vs DB mode through `hasSupabaseEnv()`
(`lib/supabase/env.ts`). `SUPABASE_SERVICE_ROLE_KEY` is read server-side by
`lib/supabase/admin.ts` to create/manage admin users (it bypasses RLS — never add the
`NEXT_PUBLIC_` prefix; a leaked service-role key is full database access).
`SUPER_ADMIN_EMAIL` identifies the single super admin (the owner) for both the app and the
DB-layer `is_admin()` check; regular admins are created in-app and carry an
`app_metadata.role` claim instead of an env entry. The legacy `ADMIN_EMAIL` var is no longer
read by the app.

`NEXT_PUBLIC_SITE_URL` should be the final `https://` domain in Production; it is
read by `lib/seo.ts` (`siteUrl()`) and used for `metadataBase`, Open Graph, the
sitemap, and `robots.txt`. It defaults to `http://localhost:3000` when unset, so
local dev and demo builds are unaffected.

`NEXT_PUBLIC_ANALYTICS` gates Vercel Analytics + Speed Insights: set it to `1` in
Production to enable them; leave it unset for Preview and local/demo so no tracking
script is injected. Analytics is also excluded from `/admin` at runtime.

### Preview = demo mode by default

Leave `NEXT_PUBLIC_SUPABASE_*` UNSET for the Preview scope. PR previews then run in
demo mode (seed data, non-persisted checkout, admin disabled) and never touch the
live catalog or live orders. Only point Preview at a separate staging Supabase
project if one exists — never at Production.

### Supabase Auth URL configuration

In Supabase -> Authentication -> URL Configuration, set the Site URL to the
production domain and add the production and Vercel preview URLs to Redirect URLs,
or admin login cookies and redirects can fail in production.

### Rollback

Vercel keeps every deployment immutable. If a Production deploy breaks, open
Vercel -> Deployments, find the previous good deploy, and use Promote to Production
for an instant rollback with no rebuild.

For the full owner go-live checklist (placeholders to replace, migrations to apply,
Supabase auth steps), see `LAUNCH_RUNBOOK.md`.
