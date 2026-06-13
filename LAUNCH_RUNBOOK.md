# Polar Launch Runbook

Go-live checklist for the owner. Polar was built with placeholders so it can demo
without any setup. This document lists exactly what to replace, where, and the
ordered Supabase and Vercel steps to take the real site live.

Work top to bottom. Everything here is operational; the code already branches on
`hasSupabaseEnv()` so the storefront keeps working in demo mode until the Supabase
env vars are set.

## 1. Replace the placeholders in code

These are committed placeholders. Edit them, commit, and push (Vercel redeploys on
push).

### Shop contact and location — `lib/config.ts`

- `WHATSAPP_NUMBER` (currently `"573000000000"`): the shop's real WhatsApp number,
  digits only, country code first (Colombia is `57`), no `+`, spaces, or dashes.
  Example: `573001234567`. This is the order-notification target; `whatsappUrl()`
  builds `https://wa.me/<number>?text=...` from it. Remove the `// TODO:` comment on
  line 1 once the real number is in.
- `ADDRESS_LINES`: the real pickup address, three lines. Also rendered in
  `components/sections/InfoRow.tsx`.
- `MAPS_URL`: the real Google Maps share link (a place URL is better than a query
  string). Rendered by the "Ver en mapa" link in `InfoRow.tsx`.

Leave `SITE_NAME = "Polar"` unless the owner asks otherwise. Keep the "Nosotros"
`NAV_LINKS` entry — a Nosotros section resolves `#nosotros`.

### Social and Instagram — `components/layout/Footer.tsx`

- `SOCIAL_LINKS` (around lines 12-16): every entry currently has `href="#"`.
  Replace with the real social profile URLs, or remove entries for accounts that do
  not exist.
- `INSTAGRAM_TILES` (around lines 18-23): the tile `<a>` elements render
  `href="#"` (around line 86). Point each tile at the real Instagram post/profile
  URL, and swap the placeholder tile images (`/images/instagram-prototype-*.png`)
  for real photos.
- Update the copyright string ("© 2024 Polar Cocktails", around line 105) to the
  launch year and the agreed brand string.

### Canonical site URL — Vercel + Supabase (no code edit)

`NEXT_PUBLIC_SITE_URL` is read by `lib/seo.ts` (`siteUrl()`) for `metadataBase`,
Open Graph, the sitemap, and `robots.txt`. Set it to the production `https://`
domain in Vercel (step 4 below), and set the matching Site URL / Redirect URLs in
Supabase Auth (step 3 below). It defaults to `http://localhost:3000`, so dev/demo
are unaffected.

## 2. Supabase: create the project and load the schema

1. Create a Supabase Cloud project in a region close to Colombia (for example
   `us-east-1`). Record the database password in a password manager.
2. From Project Settings -> API, copy the Project URL, the anon public key, and the
   service_role key (you will paste these into Vercel in step 4).
3. In Supabase Studio -> SQL Editor, apply the migrations IN ORDER, as separate
   executions (paste the full file contents, run, then the next):
   1. `supabase/migrations/0001_init.sql`
   2. `supabase/migrations/0002_rls.sql`
   3. `supabase/migrations/0003_*.sql`
   4. `supabase/migrations/0004_*.sql`
   5. `supabase/migrations/0005_*.sql`

   The migrations are idempotent, so re-running is safe. The final `create_order`
   RPC (from `0005`) returns the order short code (a `POL-` code) and includes the
   inventory checks, promo logic, and the tightened phone guard.
4. Backfill product images so DB mode shows the same photos as the demo (the seed
   inserts `image_url = null`). Run this once in the SQL editor, verbatim:

   ```sql
   -- One-off: align DB product images with the demo seed (slug-keyed).
   update products set image_url = case slug
     when 'polar-blue'   then '/images/polar-cocktail-product-transparent-trimmed.png'
     when 'mora-polar'   then '/images/polar-cocktail-purple-transparent-trimmed.png'
     when 'tropical-mix' then '/images/polar-cocktail-golden-transparent-trimmed.png'
     when 'fresa-colada' then '/images/polar-cocktail-red-transparent-trimmed.png'
     when 'mango-loco'   then '/images/polar-cocktail-mango-transparent-trimmed.png'
     when 'polar-oreo'   then '/images/polar-cocktail-mint-cookie-transparent-trimmed.png'
     else image_url
   end
   where slug in ('polar-blue','mora-polar','tropical-mix','fresa-colada','mango-loco','polar-oreo');
   ```

## 3. Supabase: lock down auth and create the admin

1. Authentication -> Providers -> Email: ensure email/password is enabled.
2. Authentication -> Sign In / Providers (or Settings): turn OFF "Allow new users
   to sign up" so the storefront cannot self-register admins. Keep this off — with
   sign-ups disabled, every authenticated user is the admin, which the RLS policies
   rely on.
3. Authentication -> Users -> Add user -> Create new user: set the email to the
   value you will use for `ADMIN_EMAIL`, set a password, and check "Auto Confirm
   User". This is the only account that can sign in at `/admin`.
4. Authentication -> URL Configuration: set the Site URL to the production domain
   and add the production and Vercel preview URLs to Redirect URLs. Skipping this is
   the most common cause of admin-login failures in production.

## 4. Vercel: deploy

1. Import the git repo. The framework auto-detects as Next.js. Leave Build Command,
   Output, and Install Command at defaults; no `vercel.json` is needed.
2. Pin the Node version to 20 or 22 in Project Settings -> General -> Node.js
   Version so it does not float.
3. Set the environment variables for the Production scope:
   - `NEXT_PUBLIC_SUPABASE_URL` — the Supabase Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the Supabase anon public key.
   - `SUPABASE_SERVICE_ROLE_KEY` — the service_role key. SERVER ONLY: never add the
     `NEXT_PUBLIC_` prefix.
   - `ADMIN_EMAIL` — the admin email from step 3 (setup metadata).
   - `NEXT_PUBLIC_SITE_URL` — the final production `https://` domain.
   - `NEXT_PUBLIC_ANALYTICS` — set to `1` to enable Vercel Analytics + Speed
     Insights in Production (leave unset for Preview/demo so no tracking is
     injected; analytics is also excluded from `/admin`).
4. Leave the Preview scope env vars UNSET so previews run in demo mode (seed data,
   non-persisted checkout, admin disabled) and never touch the live catalog or
   orders. Only point Preview at a separate staging Supabase project if one exists;
   never at Production.
5. Deploy, then attach the custom domain in Project -> Domains and configure DNS at
   the registrar per Vercel's instructions. Vercel provisions HTTPS automatically.

Rollback: Vercel -> Deployments -> previous good deploy -> Promote to Production
(instant, no rebuild).

## 5. Final placeholder gate

Before announcing launch, confirm no placeholders remain. From the repo root:

```bash
grep -rn "TODO\|FIXME\|placeholder\|573000000000\|href=\"#\"" --include=*.ts --include=*.tsx .
```

This must return nothing (or only intentional, reviewed matches). A hit on
`573000000000` or an `href="#"` means a contact link or social tile is still a
placeholder.

## 6. Smoke test the live site

On the production URL, at desktop and mobile widths:

- Storefront `/` and `/menu` load with real product photos, prices via
  `formatCop()`, Spanish copy, no emojis.
- Add to cart, reload, and confirm the cart persists; checkout `/checkout`
  persists an order (a row appears in Supabase / `/admin/orders`), totals are
  recomputed server-side, and the prefilled WhatsApp message opens to the real
  number.
- `/admin` while logged out redirects to `/admin/login`. Log in as the admin user;
  products, categories, and orders load and status updates persist.
- The "Ver en mapa" link opens the real location and every nav and footer link
  points somewhere real.
