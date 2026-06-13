# Plan 07 — Pre-launch QA & hardening

> Status: Not started · Effort: M · Depends on: 01-supabase-and-go-live-config, 02-whatsapp-order-handoff, 03-inventory-and-sold-out, 04-promos-and-discounts, 05-seo-and-analytics, 06-deployment-vercel

## Goal
Run a single, checklist-driven launch gate that integrates plans 01-06 (everything ships before launch). Verify both demo mode and DB mode end-to-end; harden RLS, security, and input validation for the new inventory + promo + phone fields; add the missing error/not-found/loading boundaries; complete accessibility (notably the focus-trap the cart drawer still lacks and the missing global `:focus-visible` ring) and responsive/visual passes against `design/PolarUIPrototype.png`; compress the heavy hero/product PNGs for LCP; and clear every remaining placeholder so Polar can go live on Vercel + Supabase Cloud.

## Scope & non-goals
This plan does NOT add product features. It is the go/no-go pass. It verifies and, where it finds gaps that are clearly QA/hardening (missing error boundaries, missing OG/`metadataBase`, weak phone validation, uncompressed images, placeholder config/links, missing focus ring/trap), it fixes them here. Where a gap belongs to an upstream plan (a missing promo column, a missing `is_active`/stock RLS rule, missing analytics), this plan FLAGS it back to that plan rather than re-implementing the feature.

Honors the locked decisions: ordering is WhatsApp + pay-on-delivery (no payment gateway), so security review centers on order integrity and admin authz, not PCI. Out of scope and explicitly NOT checked or built: age gate, customer order tracking, delivery fees/zones, business hours, automated shop alerts, online payments. Every data path must keep branching on `hasSupabaseEnv()` so demo mode and the static build of `/` and `/menu` from `lib/seed-data.ts` keep working.

## Current state
Confirmed by reading the code:

- **Modes / data paths.** `proxy.ts:8-11` returns `NextResponse.next()` when `!hasSupabaseEnv()` and calls `updateSession(request)` otherwise. `lib/actions/orders.ts:36-51` is the demo branch (prices against `SEED_PRODUCTS` filtering `p.isActive`, returns `randomUUID()`, no persist); `:53-77` is the DB branch (calls `supabase.rpc("create_order", { payload })`). `app/page.tsx` and the menu page read via `lib/queries/menu.ts` — `getProducts`/`getCategories`, each with a `!hasSupabaseEnv()` seed branch (`menu.ts:51-53` and `:75-77`) and a `SEED_*` fallback on query error.
- **Security/RLS.** `supabase/migrations/0002_rls.sql` enables RLS on all four tables. Public read is gated to `is_active = true` for categories (`:23-28`) and products (`:41-46`). Orders: anon `insert` only (`:61-66`), no anon `select` (customers cannot read orders back); admin `for all` (`:68-74`). `order_items`: anon insert only when parent order exists (`:80-87`). `create_order(payload jsonb)` is `security definer set search_path = public` (`:114-118`), prices each item from `products where is_active = true` (`:168-172`), recomputes the total (`:181-184`), and is granted to `anon, authenticated` (`:190`). The RPC also self-validates phone with `char_length(v_customer_phone) < 7` (`:142-144`).
- **Admin authz.** `lib/actions/products.ts`, `lib/actions/categories.ts`, and `lib/actions/orders.ts:93-98` all re-check `supabase.auth.getUser()` (NOT `getSession()`) before any mutation and return `"No autorizado."` when there is no user. `lib/actions/auth.ts` signs out and redirects.
- **Validation.** `lib/validation/schemas.ts` has `orderSchema` with `customerPhone: z.string().trim().min(7, "Ingresa un teléfono válido.")` (`:11-14`) — no Colombian format. `productSchema` (`:36-46`) and `categorySchema` (`:50-55`) cover the catalog; `imageUrl` uses `.url().nullable().or(z.literal(""))` (`:42`) and `accentColor` reuses the shared `hexColor` (`:32-34`). There is NO promo or inventory/stock field in this file yet; those arrive from plans 03/04 and must be re-checked here.
- **Error/empty/loading states.** Verified via `find app -name "not-found.tsx" -o -name "error.tsx" -o -name "global-error.tsx" -o -name "loading.tsx"` → NONE exist. `app/` contains only `(admin)`, `checkout`, `menu`, `order`, `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`.
- **Order confirmation page.** `app/order/[id]/page.tsx` (75 lines, `dynamic = "force-dynamic"`) renders the confirmation purely from `await params` — it does NOT import `createClient`/`notFound`, does NOT read the order from the DB, and behaves identically in demo and DB mode. There is no "unknown id" crash path today.
- **Cart drawer a11y.** `components/cart/CartDrawer.tsx` ALREADY has `role="dialog"` (`:57`), `aria-modal="true"` (`:58`), `aria-label="Carrito de compras"` (`:59`), Esc-to-close and body-scroll-lock (`:23-38`), and a `mounted` guard (`:41`). It does NOT trap focus or set initial/restore focus — that is the genuine gap.
- **Performance.** `public/images/` product PNGs measured: `polarheroimage.png` = 2,178,727 B (~2.08 MB), `polar-cocktail-purple-transparent-trimmed.png` = 1,561,315 B, and the six `-trimmed.png` variants used by `lib/seed-data.ts` (`:28,41,54,67,80,93`) are ~1.1-1.4 MB each; `public/generated/polar-mobile-hero.png` = 2,274,848 B (~2.17 MB). `Hero.tsx` imports `polarheroimage.png` (`:6`) and `polar-mobile-hero.png` (`:7`) and uses `next/image` with `priority` for both variants (mobile `:71-78`, desktop `:153-160`). `next.config.ts:4-8` allows `**.supabase.co` remote images but sets no `metadataBase`, no OG image, and no `formats`.
- **Content/config placeholders.** `lib/config.ts:1-2` `WHATSAPP_NUMBER = "573000000000"` with a TODO. `Footer.tsx:12-16` `SOCIAL_LINKS` all `href="#"`; `INSTAGRAM_TILES` (`:18-24`) render `<a href="#">` (`:86`); copyright reads "© 2024 Polar Cocktails" (`:105`). `app/layout.tsx:31-35` metadata has only `title`/`description` — no `metadataBase` / `openGraph` / `twitter`. `lib/config.ts:4-13` `ADDRESS_LINES` / `MAPS_URL` / `SITE_NAME = "Polar"` look real but must be confirmed with the owner. There is NO `public/og.png` (verified).
- **Styling.** `app/globals.css` has NO `:focus-visible` rule (verified). `formatCop()` lives in `lib/format.ts`.

## Approach
Work top-to-bottom; each step is a gate. Steps 1-2 are pure verification (no code). Steps 3-9 fix the QA/hardening gaps found above. Step 10 is the go/no-go table.

### 1. Both-modes verification — demo mode + static build
No code change. Run the matrix with env vars ABSENT (`unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY`):

1. `npm run build` succeeds and prerenders `/` and `/menu` (look for them as Static `○`/`●` in the route table, not `ƒ` Dynamic). This is the canonical gate that demo mode + SSG survived plans 01-06.
2. `npm run start`, then drive: storefront loads from `SEED_PRODUCTS`; category tabs filter; add to cart → `localStorage` key `polar_cart` populates; the cart count badge appears on both cart buttons (`Navbar.tsx:94-101` desktop, `:111-118` mobile); checkout submits → `createOrder` demo branch (`orders.ts:36-51`) returns a `randomUUID()` and routes to `/order/[id]` WITHOUT a Supabase call; the WhatsApp message (plan 02) still opens with the correct summary.
3. Confirm `Agotado` badges (plan 03) and the promo line (plan 04) render from seed data, since both must have a demo fallback per the hard rule. If either only renders in DB mode, that is a defect in plan 03/04 to flag.

### 2. Both-modes verification — full DB mode
No code change. Apply migrations in order in the Supabase SQL editor (`0001`, `0002`, then every `0003+` from plans 01/03/04 in numeric order), set both `NEXT_PUBLIC_*` env vars, `npm run build && npm run start`:

1. Menu renders from DB (`getProducts`/`getCategories` hit Supabase); toggling a product `is_active`/stock in admin flips the storefront after revalidation.
2. Place an order → row appears in `orders` + `order_items`; `total_cop` equals the server-recomputed total from the `create_order` RPC (NOT any client value); WhatsApp summary matches the persisted order.
3. Admin: log in, create/update/delete a product and a category, change an order status (`updateOrderStatus`, `orders.ts:83-113`), confirm `revalidatePath` refreshes `/`, `/menu`, and `/admin/*`.
4. Promo (plan 04): apply a valid promo, confirm the discount is recomputed server-side and reflected in `total_cop`; apply an invalid/expired promo, confirm rejection.

### 3. Security / RLS review of the final schema
No new feature; verify and, if needed, tighten. Use the Supabase SQL editor as the **anon** role (a scratch client with the anon key) to prove:

1. `insert into orders ...` as anon is allowed ONLY via the policy, but `select * from orders` returns zero rows (no anon select policy). `update`/`delete` on orders as anon are denied.
2. `insert`/`update`/`delete` on `products`, `categories`, and any new `promos`/inventory tables (plans 03/04) are denied to anon; anon `select` returns only `is_active = true` rows. **Action for the executor:** confirm plans 03/04 added matching RLS — anon must have NO write on promos/stock, and either no anon `select` on promos (validation server-only via an RPC) or anon `select` exposing only currently-valid promos. If a promos/inventory table exists with NO RLS, that is a launch blocker; fix it in a NEW follow-up migration (next free index) mirroring the `products` policy pattern in `0002_rls.sql:41-54`.
3. `create_order` remains the ONLY anon write path that prices items: re-read the final RPC and confirm it still reprices from `products where is_active = true` and (per plan 03) refuses sold-out/`stock = 0` items, and (per plan 04) recomputes any discount server-side. Client-sent prices/totals must be ignored end-to-end.
4. **Service-role key never reaches the client.** Grep the repo: `grep -rn "SERVICE_ROLE\|service_role" --include=*.ts --include=*.tsx .` must return only server-only files (never a `"use client"` file, never `NEXT_PUBLIC_`). Confirm `lib/supabase/client.ts` uses only the anon key. Confirm `.env*` is gitignored and no key is committed.
5. **Admin authz uniformly via `getUser()`.** Grep: `grep -rn "getSession" --include=*.ts --include=*.tsx .` must NOT appear as an authorization boundary (only `getUser()` is allowed, as in `products.ts`, `categories.ts`, `orders.ts:93-98`). Confirm `proxy.ts` → `updateSession` gates `/admin/*` and the admin layout re-checks `getUser()`.

### 4. Abuse / rate-limit consideration (anon createOrder + promo validation)
The anon client can call `supabase.rpc("create_order", ...)` and any promo-check RPC directly, bypassing the Server Action, so a guard must live in the DB. Pick ONE and record the decision:

- **Option A (recommended for launch, low cost): document accepted risk.** Single low-traffic shop, pay-on-delivery, no payment surface to drain, WhatsApp handoff is the real funnel. Note in the plan that abuse is bounded to junk `orders` rows the admin can ignore/delete, and rely on Supabase project-level rate limits + Vercel. No code.
- **Option B (if a guard is wanted): a lightweight per-phone/window throttle inside the RPC**, authored as a NEW migration at the next free index (e.g. `00NN_order_rate_limit.sql`, where `NN` is the next number after whatever 01/03/04 consumed). It must `create or replace function create_order(payload jsonb)` keeping the ENTIRE existing `0002` body (pricing, total recompute, atomic inserts) intact, add the throttle at the top, and re-`grant execute on function create_order(jsonb) to anon, authenticated`. Sketch:

```sql
-- 00NN_order_rate_limit.sql  (only if Option B is chosen; NN = next free index)
-- Reject more than N orders from the same phone within a short window.
create or replace function create_order(payload jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_phone text := btrim(coalesce(payload->>'customerPhone',''));
  v_recent int;
  -- ... keep ALL existing declares from 0002_rls.sql:120-131 ...
begin
  select count(*) into v_recent
  from orders
  where customer_phone = v_phone
    and created_at > now() - interval '2 minutes';
  if v_recent >= 3 then
    raise exception 'rate_limited';
  end if;
  -- ... existing 0002 create_order body unchanged (validation, pricing, inserts) ...
end;
$$;
grant execute on function create_order(jsonb) to anon, authenticated;
```

`createOrder` in `lib/actions/orders.ts:69-74` already maps any RPC error to "No pudimos crear tu pedido. Intenta de nuevo.", so a `rate_limited` raise surfaces with that friendly Spanish message — no action change needed. For promo validation, mirror the same window check in the promo-check RPC from plan 04 if it is anon-callable.

### 5. Input validation completeness (`lib/validation/schemas.ts`)
1. **Colombian phone.** Tighten `orderSchema.customerPhone` (`schemas.ts:11-14`) to a real CO format while staying permissive about spaces/`+57`:

```ts
customerPhone: z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^(\+?57)?3\d{9}$/, "Ingresa un celular colombiano válido (10 dígitos)."),
  ),
```

This runs in `createOrder` BEFORE the mode branch (`orders.ts:27-33`), so demo and DB enforce it identically. To keep the DB independently enforcing the same rule, the change is THREE-SIDED and must be done consistently:
  - the Zod schema above;
  - the RPC's own guard `if char_length(v_customer_phone) < 7 then raise exception 'invalid_customer_phone'` at `0002_rls.sql:142-144` — update to the regex (`v_customer_phone !~ '^(\+?57)?3[0-9]{9}$'`) inside the same `create or replace` migration used for any RPC change;
  - the orders table CHECK `customer_phone text not null check (char_length(customer_phone) >= 7)` at `0001_init.sql:104` — replace it via a NEW migration at the next free index that does `alter table orders drop constraint <name>` (or the inline-check name Postgres assigned) then `alter table orders add constraint orders_customer_phone_format check (customer_phone ~ '^(\+?57)?3[0-9]{9}$')`. Adopt only if the team decides on a strict stored format; otherwise leave the DB at `>= 7` and keep just the Zod normalization. SETTLE the exact policy (open question) before writing this migration, since the stored value must match whatever the Zod `transform` produces.
2. **Inventory fields (plan 03).** Confirm any new `stock`/`isSoldOut`/`is_active` admin field is present and validated in `productSchema` (e.g. `stock: z.number().int().nonnegative()`); confirm the `imageUrl` `.url().nullable().or(z.literal(""))` pattern (`:42`) and shared `hexColor` (`:32-34`) are reused, not re-invented. Flag any missing validation back to plan 03.
3. **Promo fields (plan 04).** Confirm the promo schema validates: code (trimmed, nonempty), type (`enum(["percent","fixed"])` or equivalent), value (percent `1..100` int; fixed `nonnegative` int COP), and optional date window (`starts_at <= ends_at`). Flag any missing bound back to plan 04.

### 6. Accessibility pass
Audit and fix on the dark theme:

1. **Focus states.** Every interactive element needs a visible focus ring. The cart buttons (`Navbar.tsx:82-102` desktop, `:104-119` mobile), nav links (`:69-80`), CTAs (`Hero.tsx:129-146`), and category tabs (`.pill-active`/`.pill-inactive`) must show `:focus-visible`. `app/globals.css` currently has NO `:focus-visible` rule — add a global one scoped to `.btn-brand, .btn-ghost, .btn-outline-rect, a, button` using a `polar-accent`-derived ring (reuse the `@theme` tokens; do not invent colors).
2. **Cart drawer dialog semantics.** `CartDrawer.tsx` ALREADY provides `role="dialog"` (`:57`), `aria-modal="true"` (`:58`), `aria-label="Carrito de compras"` (`:59`), Esc-to-close and scroll-lock (`:23-38`). The GAP is focus management: add a focus trap while open, move initial focus into the panel on open, and restore focus to the trigger on close. Do not re-add the dialog attributes that already exist.
3. **Keyboard nav.** Tab through: navbar → hero CTAs → category tabs (arrow-key or tab navigable, `aria-selected` on the active pill) → product cards → add-to-cart → open drawer → checkout. Cart drawer (with the new trap) and category tabs must be fully operable without a mouse.
4. **Contrast.** Check muted text (`#B9B2C6` in Footer, `#D4CDDD` in hero subcopy, `text-polar-dim`) on `#040512`/glass backgrounds meets WCAG AA (4.5:1 for body). The "© 2024" line (`text-polar-dim`, `Footer.tsx:104-105`) and dim hero subcopy (`Hero.tsx:97`) are the likeliest fails; darken background or lighten the text token if below AA.

### 7. Responsive / visual QA against the prototype
Drive at 375px (mobile) and >=1280px (desktop), comparing to `design/PolarUIPrototype.png` and `public/generated/polar-mobile-concept.png`:

1. No text overflow/overlap: hero headline `Hero.tsx:91-95` at 375px, the 12/8 stat row `:107-127`, footer 5-col Instagram grid `Footer.tsx:82-99`, InfoRow three-up.
2. WhatsApp "Pide ya" CTA: present and tappable in Navbar (`:82-102`), Hero CTA (`:130-138`), InfoRow CTAs, MobileBottomNav; all resolve to the real number after Step 10.
3. `Agotado` badges (plan 03): visible on sold-out product cards at both widths, do not clip the price or image.
4. Promo line (plan 04): renders without breaking card layout; struck-through original + discounted price both legible via `formatCop()` (integer COP only).
5. Snowfall + glow layers do not steal pointer events from CTAs (`pointer-events-none` already on the hero glow `Hero.tsx:56`).

### 8. Error / empty / loading / 404 boundaries
Currently NONE exist. Add minimal dark-theme boundaries reusing `.container-polar` and the existing button classes:

1. `app/not-found.tsx` — Spanish 404 ("Página no encontrada") with a link home. Used automatically by `notFound()`.
2. `app/error.tsx` (`"use client"`, with `reset`) — generic Spanish error with a "Reintentar" `.btn-brand` calling `reset()`.
3. `app/global-error.tsx` (`"use client"`) — wraps `<html><body>` for layout-level failures.
4. `app/loading.tsx` — lightweight skeleton/spinner for the storefront route transition.
5. `app/order/[id]/page.tsx` — TODAY this page renders only from `await params` and does NOT read the DB or call `notFound()`, so it cannot crash on an unknown id (it shows the id as the order number in both modes). Do NOT add a `notFound()` here speculatively. Instead, CONFIRM it still renders safely in both modes, and FLAG to plan 02: if plan 02 changes this page to fetch the persisted order (e.g. to show line items), that fetch MUST branch on `hasSupabaseEnv()` (demo orders are never persisted, so a `randomUUID()` will have no row) and call `notFound()` only on a missing row in DB mode — never break the demo confirmation.
6. Empty states: storefront/menu when a category has zero active products, and admin lists when empty — confirm a Spanish "no hay ..." message instead of a blank grid.

Sketch:

```tsx
// app/not-found.tsx  (Server Component)
import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container-polar flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-4xl text-white">Página no encontrada</h1>
      <p className="text-polar-dim">La página que buscas no existe.</p>
      <Link href="/" className="btn-brand h-[44px] px-5">Volver al inicio</Link>
    </main>
  );
}
```

### 9. Performance / LCP — compress the hero + product PNGs
The 1-2.2 MB PNGs are the dominant LCP cost: `polarheroimage.png` 2.08 MB, `public/generated/polar-mobile-hero.png` 2.17 MB, the six `-trimmed.png` product PNGs ~1.1-1.4 MB each (referenced in `lib/seed-data.ts:28,41,54,67,80,93`).

1. Re-encode every shipped image to a web-sized PNG/WebP, preserving transparency and the exact framing the cards/hero crop to. Target hero <= ~300 KB, product cards <= ~120 KB. Keep the SAME filenames so `seed-data.ts` `imageUrl` and the `Hero.tsx` static imports (`:6-7`) do not change (or update those references atomically if filenames change). Suggested local tooling: `npx @squoosh/cli` or `pngquant`/`oxipng` — dev-time only, NOT added as project deps.
2. Confirm `next/image` is doing the right thing: `priority` only on the true LCP hero images (already on `Hero.tsx:71-78` mobile and `:153-160` desktop); add explicit `sizes` to any product `<Image>` that lacks it; ensure below-the-fold imagery (Instagram tiles already `fill` + `sizes="90px"`, `Footer.tsx:90-96`) is NOT marked `priority` so it lazy-loads.
3. In `next.config.ts`, keep the `**.supabase.co` `remotePatterns` (`:7`) for DB-mode product photos; optionally add `formats: ["image/avif","image/webp"]` so Vercel serves modern formats. Re-run `npm run build` and re-verify each card visually after re-encoding.

### 10. Content / config audit + go/no-go Definition of Done
Clear every placeholder, then fill the DoD table.

1. `lib/config.ts:2` — replace `WHATSAPP_NUMBER = "573000000000"` with the real digits-only CO number; remove the TODO. Confirm `ADDRESS_LINES` (`:4-8`), `MAPS_URL` (`:10-11`), `SITE_NAME` (`:13`) with the owner.
2. `components/layout/Footer.tsx:12-16` — replace `SOCIAL_LINKS` `href="#"` and the `INSTAGRAM_TILES` `<a href="#">` (`:86`) with real URLs (or remove links that do not exist); update "© 2024 Polar Cocktails" (`:105`) to the launch year and the agreed brand string.
3. SEO/OG (plan 05) — confirm `app/layout.tsx` metadata (`:31-35`) has `metadataBase` set to the production domain and `openGraph`/`twitter` with a real OG image asset (there is no `public/og.png` today — add one); confirm analytics is wired and firing in production. If missing, that is a plan-05 gap to close before go.
4. Final grep for stragglers: `grep -rn "TODO\|FIXME\|placeholder\|573000000000\|href=\"#\"" --include=*.ts --include=*.tsx .`.

**Definition of Done — go/no-go table:**

| Plan | Gate / manual check | Status |
| --- | --- | --- |
| 01 supabase-and-go-live-config | `0003+` migrations applied in order; env vars set; `hasSupabaseEnv()` true in prod; demo build still green with env absent | [ ] |
| 02 whatsapp-order-handoff | DB-mode order persists, then prefilled WhatsApp opens with correct summary to the real number; demo mode opens WhatsApp without persist | [ ] |
| 03 inventory-and-sold-out | Sold-out/`stock=0` products show `Agotado`, are blocked in `create_order`, hidden/disabled in cart; seed fallback renders in demo | [ ] |
| 04 promos-and-discounts | Valid promo recomputed server-side into `total_cop`; invalid/expired rejected; promo line renders at both widths; demo fallback works | [ ] |
| 05 seo-and-analytics | `metadataBase` + OG + twitter set with real image; analytics firing in prod; build green | [ ] |
| 06 deployment-vercel | Production deploy on Vercel + Supabase Cloud; env vars set in Vercel; custom domain + HTTPS; admin login works in prod | [ ] |
| 07 (this) | `tsc --noEmit` + `lint` + `build` green in BOTH modes; RLS/authz/service-key checks pass; error/not-found/loading present; a11y (focus ring + drawer focus-trap) + responsive passes; images compressed; no placeholders remain | [ ] |

Launch only when every row is checked.

## Database changes
None required by default. The four base tables and the existing RLS in `0002_rls.sql` are NOT altered by this plan; it verifies them and only adds RLS in a follow-up if plans 03/04 shipped a table without policies (a blocker fixed by mirroring the `products` policy pattern at `0002_rls.sql:41-54`).

Up to two OPTIONAL migrations, each adopted only if its decision is taken, and each named at the NEXT FREE index after whatever 01/03/04 consumed (today only `0001`/`0002` exist; the exact numbers are determined at execution time — do NOT hardcode `0006`/`0007`):
- `00NN_order_rate_limit.sql` — `create or replace` of `create_order` wrapping it with a per-phone/window throttle (Step 4, Option B), keeping the entire existing pricing/insert body and re-`grant execute ... to anon, authenticated`.
- `00NN_phone_check.sql` — replaces the `orders.customer_phone` CHECK (currently `char_length >= 7`, `0001_init.sql:104`) with the regex `^(\+?57)?3[0-9]{9}$` via `drop constraint` + `add constraint`, mirroring the tightened Zod rule and the updated RPC guard (Step 5). Adopt only after the phone policy is settled.

Order integrity is preserved throughout: `create_order` remains the sole anon write path that prices items, recomputing `unit_price_cop` and `total_cop` server-side; client-sent prices/discounts are never trusted.

## Demo-mode parity
Every step preserves the `hasSupabaseEnv()` branch. The error/not-found/loading boundaries (Step 8) are mode-agnostic and the order confirmation page stays param-only in both modes. Image compression (Step 9) only changes binary assets referenced by `lib/seed-data.ts` and `Hero.tsx`, so `/` and `/menu` still statically prerender from seed data. Phone validation (Step 5) runs in the shared `orderSchema`, which `createOrder` parses BEFORE the mode branch (`orders.ts:27-33`), so demo and DB enforce it identically. Focus ring/trap (Step 6) and config/Footer placeholder fixes (Step 10) are static and do not touch data paths. Step 1 explicitly re-asserts that `npm run build` with env vars absent prerenders `/` and `/menu` from `SEED_PRODUCTS`.

## Affected files
- `app/not-found.tsx` (new) — Spanish 404.
- `app/error.tsx` (new) — route error boundary with `reset()`.
- `app/global-error.tsx` (new) — layout-level error boundary.
- `app/loading.tsx` (new) — route loading state.
- `app/order/[id]/page.tsx` — confirm it stays param-only and crash-free in both modes; do NOT add `notFound()` (flag to plan 02 if that plan adds a DB read).
- `lib/validation/schemas.ts` — tighten `customerPhone` (`:11-14`); verify inventory + promo fields.
- `lib/actions/orders.ts` — no change expected; the existing RPC-error mapping (`:69-74`) already surfaces a `rate_limited` raise with a friendly message.
- `supabase/migrations/00NN_order_rate_limit.sql` (optional) and `00NN_phone_check.sql` (optional) — next free indices.
- `next.config.ts` — optional `formats: ["image/avif","image/webp"]`; keep `**.supabase.co`.
- `app/layout.tsx` — confirm/add `metadataBase` + `openGraph`/`twitter` (plan 05 territory; flag if missing).
- `app/globals.css` — add a global `:focus-visible` ring (currently absent); contrast token tweaks if AA fails.
- `lib/config.ts` — real `WHATSAPP_NUMBER` (`:2`), confirmed address/maps/site name.
- `components/layout/Footer.tsx` — real social/Instagram URLs (`:12-16`, `:86`); year + brand string (`:105`).
- `components/cart/CartDrawer.tsx` — add focus trap + initial/restore focus (dialog attributes already present).
- `components/layout/Navbar.tsx`, `components/sections/Hero.tsx`, `components/menu/ProductCard.tsx` — `sizes`/`priority`/focus-ring audit (no layout change).
- `public/images/*`, `public/generated/*` — re-encoded compressed assets (same filenames); `public/og.png` (new) for plan 05 OG.

## Verification
Gates (run in BOTH demo and DB mode where applicable):

1. `npx tsc --noEmit` — clean.
2. `npm run lint` — clean.
3. `npm run build` — green, and the route table shows `/` and `/menu` as static when env vars are ABSENT (proves demo SSG survived). Re-run with env vars PRESENT for the DB path.
4. `npm run start` + manual:
   - Demo: storefront/menu from seed, cart, checkout → WhatsApp → `/order/[id]` with no DB call; `Agotado` + promo render from seed.
   - DB: order persists with server-recomputed `total_cop`; admin CRUD + status change revalidate; promo + sold-out enforced in `create_order`.
   - Anon RLS proofs (Step 3): no anon `select` on orders, no anon write on catalog/promos, service-role key absent from client bundle, `getSession()` never an authz boundary.
   - a11y (Step 6): keyboard-only path through nav → hero CTAs → category tabs → add to cart → drawer (Esc closes, focus trapped while open, focus restored to trigger on close) → checkout; visible focus rings everywhere; AA contrast on muted text.
   - Responsive (Step 7) at 375px and 1280px against `design/PolarUIPrototype.png` and `public/generated/polar-mobile-concept.png`: no overflow; WhatsApp buttons present; `Agotado`/promo lines correct.
   - Boundaries (Step 8): visit an unknown path → `not-found.tsx`; force a thrown error → `error.tsx` with working "Reintentar"; `/order/<random-uuid>` still renders the confirmation (no crash) in both modes.
   - Perf (Step 9): re-encoded images shipped; hero is LCP and `priority`; below-the-fold lazy; visually unchanged vs prototype.
   - Content (Step 10): final grep returns no `TODO`/`573000000000`/`href="#"`; DoD table all checked.

Explicitly confirm demo mode + the static build of `/` and `/menu` still pass after every change (re-run gate 3 with env vars unset as the last action before declaring go).

## Risks & open questions
- Depends on 01-06 having landed; this gate WILL surface real gaps in promo/inventory RLS, schema fields, or analytics — those are fixed in their OWNING plans, not patched here.
- Compressing `public/images`/`public/generated` changes binaries; must re-verify every product card + hero against the prototype for transparency/framing regressions.
- `create_order` is `security definer` granted to anon, so any abuse guard or phone tightening must live in the RPC/RLS (anon can call `rpc("create_order")` directly, bypassing the Server Action).
- Tightening the phone rule must be consistent across `schemas.ts:11-14`, the RPC guard `0002_rls.sql:142-144`, and the orders CHECK `0001_init.sql:104` (replaced via drop/add constraint) — a mismatch rejects valid orders or stores values the CHECK refuses.
- Launching with `lib/config.ts` `WHATSAPP_NUMBER = "573000000000"` or Footer `href="#"` ships a broken handoff and dead links — hard blocker until real values arrive.
- Optional migration numbers cannot be fixed in advance (only `0001`/`0002` exist; 01/03/04 will take `0003+`) — pick the next free index at execution time.
- Open: real WhatsApp number / address / maps / social URLs; an OG image asset (`public/og.png`) + `metadataBase` for plan 05; rate-limit guard vs accepted risk; exact CO phone policy (strict 10-digit `3XXXXXXXXX` vs `+57`/spaces normalized); whether plan 02 turns `app/order/[id]` into a DB read (which would require `hasSupabaseEnv()` branching + `notFound()` on a missing row).
