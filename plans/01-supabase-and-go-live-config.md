# Plan 01 — Supabase provisioning & go-live configuration

> Status: Not started · Effort: M · Depends on: none

## Goal
Flip Polar from demo mode to a real Supabase-backed deployment: provision the Supabase Cloud project, apply the existing migrations, create the single admin user, wire all four environment variables, fill the placeholders in `lib/config.ts` (and fix the one dead nav anchor), and confirm the DB-backed menu + persisted orders + admin gating all work — while keeping demo mode and the static build of `/` and `/menu` fully intact.

## Scope & non-goals
This is the FOUNDATION plan and the prerequisite for plans 03/04 (which add migrations `0003_*.sql`, `0004_*.sql`). In scope:
1. Create the Supabase Cloud project and document the four env vars and where each is used.
2. Apply `supabase/migrations/0001_init.sql` then `0002_rls.sql` by hand in the SQL editor; verify tables/enums/RLS/`create_order` RPC exist.
3. Disable public sign-ups and create the single admin user matching `ADMIN_EMAIL`; verify `/admin/login` works and `proxy.ts` gating redirects unauthenticated `/admin/*`.
4. Verify the menu loads from the DB and an order persists via the `create_order` RPC.
5. Reconcile product imagery between demo (`lib/seed-data.ts` `imageUrl -> /images/*-trimmed.png`) and the DB seed (`0001_init.sql` inserts `image_url = null`). Recommendation: keep local `/public/images` paths for launch; document the Supabase Storage alternative.
6. Fill `lib/config.ts` placeholders: `WHATSAPP_NUMBER`, `ADDRESS_LINES`, `MAPS_URL`, `NAV_LINKS` (including resolving the dead `#nosotros` anchor), confirm `SITE_NAME`.
7. Produce a concrete go-live config checklist (env + Vercel).

Non-goals (locked decisions): NO online payment gateway (ordering is WhatsApp + pay on delivery — see plan 02); NO age gate, customer order tracking, delivery fees/zones, business hours, or automated shop alerts. This plan does NOT author new migrations — the new-schema work belongs to plans 03 (inventory/sold-out) and 04 (promos). This plan is mostly ops plus two small config edits (`lib/config.ts`, and a one-line `image_url` decision in the DB seed). It does NOT introduce a service-role Supabase client (none exists today and none is needed for launch — see Risks).

## Current state
Confirmed by reading the code:

- **Env switch:** `lib/supabase/env.ts` — `hasSupabaseEnv()` returns true only when both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (lines 5-10).
- **Clients:** `lib/supabase/client.ts` (browser, `createBrowserClient`), `lib/supabase/server.ts` (RSC/actions, `await cookies()`), `lib/supabase/middleware.ts` (`updateSession`, calls `getUser()` at lines 33-35 and guards admin routes at 38-45).
- **Proxy:** `proxy.ts` short-circuits with `NextResponse.next()` when `!hasSupabaseEnv()` (lines 7-10); otherwise calls `updateSession`. The matcher (lines 14-25) already excludes static/image assets. The admin guard treats `/admin/login` as public (`middleware.ts` lines 38-39: `pathname.startsWith("/admin") && pathname !== "/admin/login"`), and the actual login route is `app/(admin)/admin/(auth)/login/page.tsx`, which resolves to `/admin/login` — so the guard exception is correct.
- **Login:** `app/(admin)/admin/(auth)/login/page.tsx` line 33 uses `supabase.auth.signInWithPassword(...)`; it also short-circuits with a Spanish "base de datos no está configurada" message when `NEXT_PUBLIC_SUPABASE_URL` is absent (line 17/23). Sign-out is `lib/actions/auth.ts` (`signOut()` is a no-op `signOut` + redirect when env absent).
- **Reads (demo/DB branch):** `lib/queries/menu.ts` — `getCategories()` (line 51) and `getProducts()` (line 75) return `SEED_CATEGORIES`/`SEED_PRODUCTS` when `!hasSupabaseEnv()`, else query Supabase and fall back to seed on error. `lib/queries/orders.ts` — `getOrders()` returns `[]` (line 57) and `getOrderById()` returns `null` (line 86) when env absent (orders only exist in DB mode).
- **Writes:** `lib/actions/orders.ts` — `createOrder()` prices against `SEED_PRODUCTS` and returns `randomUUID()` in demo mode (lines 36-51); in DB mode calls `supabase.rpc("create_order", { payload: {...} })` (lines 54-67). `updateOrderStatus()` re-checks `getUser()` (lines 93-98).
- **Migrations:** `0001_init.sql` creates enums (`order_status`, `delivery_type`), tables (`categories`, `products`, `orders`, `order_items` with generated `line_total_cop` = `qty * unit_price_cop`), indexes, the `set_updated_at` trigger, and seeds 4 categories + 6 products. CRITICAL: the product seed inserts `image_url = null` for every product (line 162: `select c.id, p.name, ... null, true, p.sort_order`). `0002_rls.sql` enables RLS, adds public-read (active only) + admin-all policies (categories 30-36, products 48-54, orders 68-74, order_items 89-95), anon-insert for orders/order_items, and defines the `create_order(payload jsonb)` `SECURITY DEFINER` RPC granted to `anon, authenticated` (line 190). The RPC re-prices every line from the `products` table server-side and ignores client totals.
- **Env vars:** `.env.example` documents all four: `NEXT_PUBLIC_SUPABASE_URL` (line 7), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (line 10), `SUPABASE_SERVICE_ROLE_KEY` (server-only, line 14), `ADMIN_EMAIL` (line 17). Grep confirms `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAIL` are NOT referenced anywhere in `lib/` or `app/` today — they are declared for documentation/manual use only.
- **Config:** `lib/config.ts` — `WHATSAPP_NUMBER = "573000000000"` (placeholder, TODO comment line 1), `ADDRESS_LINES` (Tuluá / Calle 41a # 26-81 / Paso ancho príncipe), `MAPS_URL` (query-string maps link), `SITE_NAME = "Polar"`, `NAV_LINKS` (Inicio `/`, Menú `/menu`, Nosotros `#nosotros`, Ubicación `#ubicacion`, Contacto `#contacto`), and `whatsappUrl(text)` helper (line 28). `NAV_LINKS` is rendered in `components/layout/Navbar.tsx` (lines 70-79).
- **Nav anchor reality (verified by grep):** `#ubicacion` resolves to `id="ubicacion"` in `components/sections/InfoRow.tsx` (line 47); `#contacto` resolves to `id="contacto"` in `components/sections/InfoRow.tsx` (line 76). `components/sections/Sabores.tsx` has `id="menu"` (line 25), but NAV_LINKS "Menú" points to the `/menu` route, not `#menu` — consistent. There is **NO `id="nosotros"` anywhere** in `components/` or `app/`, so the "Nosotros" link (`#nosotros`) is a dead anchor today. `app/page.tsx` only composes `Hero` + `Sabores` + `InfoRow` and declares no section ids of its own — the live anchor ids live inside those section components.
- **Images:** `public/images/` contains the six `*-transparent-trimmed.png` cup photos referenced by `lib/seed-data.ts` (confirmed on disk) plus hero/instagram art. `next.config.ts` `images.remotePatterns` already allows `https://**.supabase.co` (line 7).

## Approach

### Step 0 — Create the Supabase Cloud project (ops)
1. At https://supabase.com create a new project in a region close to Colombia (e.g. `us-east-1`); set a strong database password and record it in the password manager.
2. From **Project Settings -> API**, copy: **Project URL** (-> `NEXT_PUBLIC_SUPABASE_URL`), **anon public** key (-> `NEXT_PUBLIC_SUPABASE_ANON_KEY`), **service_role** key (-> `SUPABASE_SERVICE_ROLE_KEY`, server-only).
3. No code changes here. No Supabase CLI is wired up; everything below is done in the Supabase dashboard + Vercel.

### Step 1 — Document and set the environment variables
The four variables and exactly where each is consumed:

| Var | Exposure | Read by | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (bundled to browser) | `client.ts`, `server.ts`, `middleware.ts`, `env.ts` | Supabase project URL; half of the `hasSupabaseEnv()` switch |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | same as above | anon key for RLS-scoped queries; other half of the switch |
| `SUPABASE_SERVICE_ROLE_KEY` | SERVER ONLY — never `NEXT_PUBLIC_*` | not referenced in code today | reserved for privileged maintenance scripts; keep documented, do NOT expose |
| `ADMIN_EMAIL` | SERVER ONLY (no `NEXT_PUBLIC_` prefix) | not referenced in code today | identifies the single admin to create in Supabase Auth; authorization is enforced by RLS + `getUser()`, not by comparing this value |

Local: `cp .env.example .env.local` and fill the first two (required to enter DB mode), plus the latter two for completeness. The `.env.example` text is already accurate (lines 6-17) — no edit required, but confirm `SUPABASE_SERVICE_ROLE_KEY` stays without the `NEXT_PUBLIC_` prefix so it is never shipped to the client.

### Step 2 — Apply migrations by hand, in order
In **Supabase Studio -> SQL Editor**, run as two separate executions:
1. Paste the full contents of `supabase/migrations/0001_init.sql`, run. Both migrations are idempotent (`create ... if not exists`, `on conflict do nothing`, `do $$ ... if not exists`, `create or replace`), so re-running is safe.
2. Paste the full contents of `supabase/migrations/0002_rls.sql`, run.

Verify with a sanity query in the SQL editor:
```sql
-- expect 4 tables
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('categories','products','orders','order_items');
-- expect the two enums
select typname from pg_type where typname in ('order_status','delivery_type');
-- expect 4 categories, 6 products
select (select count(*) from categories) as cats,
       (select count(*) from products)   as prods;
-- expect rls = true on all four
select relname, relrowsecurity from pg_class
 where relname in ('categories','products','orders','order_items');
-- expect the RPC to exist
select proname from pg_proc where proname = 'create_order';
```
Expected: 4 tables, 2 enums, `cats=4`, `prods=6`, `relrowsecurity = t` for all four, one `create_order` row.

### Step 3 — Auth: disable public sign-ups, create the single admin
1. **Authentication -> Providers -> Email:** ensure email/password is enabled.
2. **Authentication -> Sign In / Providers (or Settings):** turn OFF "Allow new users to sign up" so the storefront cannot self-register admins.
3. **Authentication -> Users -> Add user -> Create new user:** email = the value chosen for `ADMIN_EMAIL`, set a password, and check "Auto Confirm User" (so no email confirmation is needed). This is the only account that can pass `getUser()`.
4. No code change: RLS `*_admin_all` policies (`0002_rls.sql` lines 30-36, 48-54, 68-74, 89-95, all `using (true) with check (true)` for `authenticated`) grant any authenticated user full catalog/order access, and the single-user model means "authenticated == admin".

### Step 4 — Reconcile product imagery (the one substantive data decision)
Today demo mode shows real cup photos (`lib/seed-data.ts` `imageUrl: "/images/...-trimmed.png"`), but the DB seed in `0001_init.sql` inserts `image_url = null` (line 162), so a fresh DB-mode deploy would fall back to `PlaceholderCup` and look worse than the demo.

**Recommendation for launch: keep local `/public/images` paths.** They ship in the Next bundle, `next/image` optimizes them, no Storage bucket or upload step is needed, and `Product.imageUrl` (a `string | null`) accepts a site-relative path equally well as an absolute URL — `lib/queries/menu.ts` `mapProductRow` passes `row.image_url` straight through to `imageUrl` (line 42), and the storefront prefers it over the placeholder. Implement by running a tiny one-off SQL statement (once, after Step 2) that backfills the six `image_url` values to match `SEED_PRODUCTS`, keyed by `slug` so it is order-independent:

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
(These six slug->path pairs are verified to match `lib/seed-data.ts` exactly, and all six files exist under `public/images/`.) Run this in the SQL editor (it is an operational backfill, not new schema, so it does NOT become a `0003_*.sql` file — that numbering is reserved for plans 03/04). Optionally the executor MAY instead edit the seed `select` in `0001_init.sql` line 162 to emit these paths instead of `null`, but since the migration has already been applied, the `update` above is the lower-risk path for an existing project; both are documented so the executor can pick based on whether the DB is fresh.

**Documented alternative (not for launch):** create a public Supabase Storage bucket `product-images`, upload the six PNGs, and set `image_url` to the public object URLs (`https://<project>.supabase.co/storage/v1/object/public/product-images/<file>`). `next.config.ts` already allows `**.supabase.co` (line 7), so no config change is needed. Defer this until non-technical staff need to swap photos from the admin without a redeploy; for launch the `/public` path is simpler and faster.

### Step 5 — Fill `lib/config.ts` placeholders (code edit)
With the client's confirmed details, edit `lib/config.ts`:
- `WHATSAPP_NUMBER`: replace `"573000000000"` with the real number, digits only, country code first (Colombia `57`), no `+`/spaces/dashes — `whatsappUrl()` (line 28) builds `https://wa.me/<number>?text=...` and this number is the shop notification target for plan 02's order message. Remove the `// TODO:` comment on line 1 once the real number is in.
- `ADDRESS_LINES`: confirm the three lines are the real pickup address (also rendered in `components/sections/InfoRow.tsx`).
- `MAPS_URL`: replace with the real Google Maps share link (a place URL is preferable to a query string); rendered by the "Ver en mapa" link in `InfoRow.tsx` (line 65).
- `NAV_LINKS`: **resolve the dead `#nosotros` anchor.** Verified against the codebase: `#ubicacion` and `#contacto` DO resolve (ids in `components/sections/InfoRow.tsx` lines 47 and 76), but there is NO `id="nosotros"` anywhere, so the "Nosotros" link currently scrolls nowhere. Pick one of:
  - remove the `{ label: "Nosotros", href: "#nosotros" }` entry, or
  - relabel/repoint it to an existing target (e.g. point it at the menu section `#menu` in `Sabores.tsx`), or
  - if the client confirms an "about" block is coming, add an `id="nosotros"` to the relevant section and keep the link.
  Do NOT leave a dead `#` target. ("Menú" -> `/menu` is correct and needs no change.)
- `SITE_NAME`: confirm `"Polar"` (used in metadata/UI) — leave as is unless the client specifies otherwise.

No branching needed here — these are static constants used identically in both modes.

### Step 6 — Verify DB mode end-to-end locally before deploying
1. With `.env.local` filled, `npm run dev`. `/` and `/menu` now render from Supabase (`getProducts`/`getCategories` take the DB branch). Confirm the six products show with photos (Step 4 backfill).
2. Place a test order through `/checkout` -> `createOrder` -> RPC -> `/order/[id]`. Confirm a row appears in `orders` and matching `order_items` in Supabase, and that `total_cop` equals the recomputed server-side total (NOT a client value — the RPC re-prices from `products`).
3. Visit `/admin` unauthenticated -> expect redirect to `/admin/login` (proves `proxy.ts` + `updateSession` gating). Log in with the admin user -> dashboard, products, categories, orders all load; the test order is visible and its status can be changed (`updateOrderStatus`, which re-checks `getUser()`).

### Step 7 — Vercel + Supabase Cloud go-live checklist
1. Import the repo into Vercel; framework auto-detected as Next.js. No `tailwind.config.ts` to worry about (Tailwind v4 is CSS-first).
2. In **Vercel -> Settings -> Environment Variables**, add all four for Production (and Preview if previews should hit the DB): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`. The two `NEXT_PUBLIC_*` are exposed to the browser by design; the other two must stay server-only (no `NEXT_PUBLIC_` prefix).
3. **Supabase -> Authentication -> URL Configuration:** set Site URL to the production domain and add the Vercel preview/prod URLs to Redirect URLs so auth cookies/redirects work.
4. Deploy; smoke-test the production URL: storefront renders from DB, a real test order persists and triggers the WhatsApp handoff (plan 02), `/admin` gating works.
5. Keep `.env.local` and the service-role key out of git (already covered by the standard Next `.gitignore`; confirm `.env.local` is ignored).

## Database changes
None as a new migration file. The existing `0001_init.sql` and `0002_rls.sql` are applied by hand (Step 2). One operational, idempotent backfill `update products set image_url = ...` (Step 4) is run once in the SQL editor to align DB-mode photos with the demo; it is data maintenance, not schema, and deliberately does NOT consume a `0003_*.sql` filename (reserved for plans 03/04). No change to the `create_order` RPC — order computation is unchanged in this plan, so order integrity (server-side re-pricing, generated `line_total_cop`) is preserved as-is.

## Demo-mode parity
Nothing in this plan alters the demo path. `hasSupabaseEnv()` stays the sole switch:
- With no env vars, `getProducts`/`getCategories` return `SEED_CATEGORIES`/`SEED_PRODUCTS` (`lib/queries/menu.ts` lines 51, 75); `proxy.ts` returns `NextResponse.next()` (no auth, lines 7-10); `createOrder` recomputes against `SEED_PRODUCTS` and returns a generated id without persisting (`lib/actions/orders.ts` lines 36-51).
- `npm run build` continues to statically generate `/` and `/menu` from seed data because no DB is reachable at build time without env vars.
- The `lib/config.ts` edits are plain constants consumed the same way in both modes, so they do not affect the static build. (Removing/relabeling the `#nosotros` nav entry changes only what renders in `Navbar`, identically in both modes.)
- The image backfill lives only in the DB; it does not touch `lib/seed-data.ts`, so demo imagery is unchanged.

## Affected files
- `lib/config.ts` — fill `WHATSAPP_NUMBER`, `ADDRESS_LINES`, `MAPS_URL`; resolve the dead `#nosotros` entry in `NAV_LINKS`; confirm `SITE_NAME`; remove the line-1 TODO (Step 5).
- `.env.local` — created locally from `.env.example`; not committed (Step 1).
- Supabase Cloud (no repo file): project, applied `0001`/`0002`, the image backfill, the admin user, sign-ups disabled (Steps 0-4).
- Vercel project settings (no repo file): the four env vars + auth URL config (Step 7).
- Optionally `supabase/migrations/0001_init.sql` line 162 — only if the executor chooses to set the six `image_url` paths in the seed for fresh DBs instead of the runtime backfill (Step 4); skip for an already-applied DB.

## Verification
Gates:
1. `npx tsc --noEmit` — passes (only `lib/config.ts` constants change).
2. `npm run lint` — passes.
3. `npm run build` — run twice: (a) with NO env vars, confirm `/` and `/menu` are statically generated from seed data and the build succeeds (demo + static build still pass); (b) with env vars present, confirm the build still succeeds.

Manual checks (DB mode, desktop AND mobile widths, against `design/PolarUIPrototype.png`):
- `/` and `/menu` render the six products from Supabase with real photos (no `PlaceholderCup` fallback), prices via `formatCop()`, layout unchanged from the prototype.
- Checkout a test order: row in `orders` + `order_items`, `total_cop` equals the server-recomputed total.
- `/admin` while logged out redirects to `/admin/login`; login with the admin user reaches the dashboard; products/categories/orders load and a status change persists.
- `lib/config.ts`: the WhatsApp link opens `wa.me/<real number>`, the "Ver en mapa" link opens the real location, and every nav link points somewhere real — confirm there is no `#nosotros` (or any other) dead anchor in the navbar at both widths; clicking each nav entry scrolls to / navigates to a real target.

Demo-mode confirmation: temporarily unset the two `NEXT_PUBLIC_SUPABASE_*` vars (or build without `.env.local`) and confirm `/` + `/menu` still build and render from seed data and checkout returns a generated order id without persisting.

## Risks & open questions
- **Service-role key is documented but unused in code.** Keep it server-only in Vercel and never prefix it with `NEXT_PUBLIC_`. If a future maintenance script needs it, add a separate service-role client under `lib/supabase/` — out of scope here.
- **Image path choice.** Local `/public/images` paths are recommended for launch (simplest, optimized by `next/image`). If staff must swap photos without a redeploy, migrate to the documented Supabase Storage bucket later; `next.config.ts` already allows `**.supabase.co` (line 7).
- **Auth URL configuration on Vercel.** Forgetting to set Site URL / Redirect URLs in Supabase Auth is the most common cause of admin-login cookie/redirect failures in production — included in the Step 7 checklist.
- **"Authenticated == admin" assumption.** With sign-ups disabled and one user created, every `authenticated` session is the admin, which the RLS `*_admin_all` policies (`using (true)`) rely on. If a second auth user is ever added, those policies would grant it admin access — keep sign-ups off.
- **Dead `#nosotros` nav anchor.** Confirmed by grep: no `id="nosotros"` exists anywhere, so "Nosotros" is a no-op link today. It must be removed/relabeled/given a real target in Step 5 — not merely "verified."
- **Open: confirm the real WhatsApp number, Maps share link, and pickup address from the client** before Step 5 (placeholders today). These are the only data values blocking a correct go-live config.
- **Open: decide the fate of the "Nosotros" link** (remove, relabel, or add a real `id="nosotros"` section). `#ubicacion`/`#contacto` already resolve to ids in `components/sections/InfoRow.tsx` (lines 47, 76).
