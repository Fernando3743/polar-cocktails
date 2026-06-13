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

## Enable real ordering + admin (Supabase)

1. Create a project at https://supabase.com and copy `.env.example` to `.env.local`, filling:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never exposed to the browser)
   - `ADMIN_EMAIL`
2. Run the SQL migrations (in the Supabase SQL editor, **in order** — they are idempotent):
   - `supabase/migrations/0001_init.sql` — tables, enums, indexes, and seeds the 4 categories
     + 6 products.
   - `supabase/migrations/0002_rls.sql` — row-level security + the first `create_order` RPC.
   - `supabase/migrations/0003_inventory.sql` — `sold_out` + optional `stock_qty`, re-issues
     `create_order` with availability checks.
   - `supabase/migrations/0004_promos.sql` — `promos` table + `validate_promo`, adds
     `promo_code`/`discount_total` to orders, re-issues `create_order` (inventory + promo).
   - `supabase/migrations/0005_order_short_code.sql` — `orders.short_code`; re-issues
     `create_order` as the **final** version, which returns the `POL-` short code (text, not
     uuid) and enforces inventory, promo, and the Colombian-phone checks.
   - Then run the one-off image backfill from `LAUNCH_RUNBOOK.md` so DB-mode products show the
     real photos instead of the placeholder.
3. In **Supabase → Authentication**: disable public sign-ups, then create one user with the
   `ADMIN_EMAIL` and a password. That user can log in at `/admin`.
4. Restart `pnpm dev`. The menu now loads from the database, orders persist, and `/admin`
   lets you manage products/prices/categories and view + update order status.

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
| `SUPABASE_SERVICE_ROLE_KEY` | No (no current code reads it) | Production, server only |
| `ADMIN_EMAIL` | No (setup metadata only) | Production, server only |
| `NEXT_PUBLIC_SITE_URL` | Yes (metadata/canonical) | Production = real domain |
| `NEXT_PUBLIC_ANALYTICS` | Yes (set to `1` to enable analytics) | Production = `1`; Preview unset |

Only the two `NEXT_PUBLIC_SUPABASE_*` vars actually drive demo vs DB mode through
`hasSupabaseEnv()` (`lib/supabase/env.ts`). `SUPABASE_SERVICE_ROLE_KEY` and
`ADMIN_EMAIL` are setup metadata: the service-role key is reserved for future
privileged server scripts (set it but never add the `NEXT_PUBLIC_` prefix — a
leaked service-role key is full database access), and `ADMIN_EMAIL` only records
which single Supabase user to create. Set all of them for completeness, but do not
expect the running app to read the latter two.

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
