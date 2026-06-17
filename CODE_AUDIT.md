# Polar - Full Code Audit

## Executive Summary

Polar is in solid shape. The load-bearing security invariants of the architecture hold up under scrutiny: order pricing is recomputed server-side and never trusts client amounts, authorization consistently uses JWT-validating `getUser()` (never `getSession()`), the admin role rides in `app_metadata` (service-role-writable only), the service-role client is gated behind `requireSuperAdmin()`, and RLS denies-by-default with no permissive anon SELECT/UPDATE/DELETE policy. No critical or high-severity issues were found, and there is no price-trust, auth-bypass, privilege-escalation, or data-exfiltration vulnerability.

What remains is a band of **medium** issues worth fixing before/at launch — a stored-XSS vector via unescaped JSON-LD, missing HTTP security headers, a modal with no focus management, a homepage video that won't play in most browsers, and an unbounded order-items array that enables cheap unauthenticated DB amplification — plus a long tail of **low/info** hardening, robustness, and code-duplication items. The dominant theme across the low/info tier is missing input bounds (`.max()` on Zod fields) and copy-paste duplication that the project's own conventions (global component classes, shared helpers) were designed to prevent.

### Severity counts (post-dedup)

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High     | 0 |
| Medium   | 5 |
| Low      | 20 |
| Info     | 16 |
| **Total**| **41** |

---

## Top Priorities

1. **Stored XSS via JSON-LD** — `components/seo/JsonLd.tsx:131-134`. Escape `<` in the serialized output: `JSON.stringify(json).replace(/</g, "\\u003c")`.
2. **No HTTP security headers** — `next.config.ts:3-17`. Add `async headers()` with HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` (clickjacking on the mutating admin), and a CSP.
3. **Homepage video is a `.mov` (video/quicktime) with no fallback** — `components/sections/HomeVideo.tsx:53-68`. Transcode to H.264/AAC MP4 served as `video/mp4`, use `<source>` with type, and drop `preload="auto"`.
4. **ProductDetailModal has no focus trap / initial focus / focus restore** — `components/menu/ProductDetailModal.tsx:16-57`. Mirror the correct `CartDrawer` pattern (capture activeElement, trap Tab, restore on close) or mark the background `inert`.
5. **Unbounded `orderSchema.items` array** — `lib/validation/schemas.ts:60`. Add `.max(50)` (and de-dupe productIds) to stop unauthenticated DB lock/CPU amplification through the `create_order` loop.
6. **Missing input `.max()` bounds across Zod schemas** — `lib/validation/schemas.ts:34,39,57,59,82,86,89`. Cap `qty` (e.g. 99), text fields (name 80 / address 200 / notes 500), and integer fields to keep totals inside int4 and prevent storage bloat.
7. **`anon` can insert junk orders directly, bypassing `create_order`** — `supabase/migrations/0002_rls.sql:61-66`. Drop `orders_anon_insert` and/or revoke anon INSERT on `orders`; checkout already routes solely through the SECURITY DEFINER RPC.

---

## Findings

### Medium

#### M1 (Security & Auth) — Stored XSS: JSON-LD injects admin-controlled strings into a `<script>` without escaping `</script>`
**Location:** `components/seo/JsonLd.tsx:131-134` (taint source `:86-90,127`)
**What is wrong:** The component renders `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />`. `JSON.stringify` does **not** escape `<`, `>`, or the literal `</script>`. The `@graph` embeds admin-controlled `p.name`/`p.description`, which flow verbatim from the DB (`lib/queries/menu.ts:51-58`) and are inserted unsanitized by `lib/actions/products.ts:30-44`; `productSchema` (`lib/validation/schemas.ts:79-81`) only enforces `.trim().min(...)`, no character restriction. A product name containing `</script><script>alert(document.cookie)</script>` breaks out of the JSON-LD block and executes.
**Why it matters:** This script runs in **every public visitor's** browser (`app/(site)/page.tsx:7,43`), not just the admin's. Regular panel admins are created in-app (`lib/actions/admins.ts:90-95`) with `app_metadata.role='admin'` and are not the site owner, so a lower-privileged or compromised admin can plant script that steals data from all visitors. The absence of any CSP (M2) means nothing blocks execution. Medium rather than high because exploitation requires an authenticated (semi-trusted) admin.
**Fix:** Escape before injecting: `JSON.stringify(json).replace(/</g, "\\u003c")` (optionally also `>`, `&`, U+2028/U+2029). This is the standard safe-JSON-in-script pattern and produces identical valid JSON-LD. Optionally also strip angle brackets in the product name/description Zod schema. (`MenuJsonLd.tsx:50` shares the pattern but only serializes static config, so it is not exploitable.)

#### M2 (Security & Auth) — No HTTP security headers (no CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
**Location:** `next.config.ts:3-17` (also `proxy.ts:6-12`, `lib/supabase/middleware.ts:9-70`)
**What is wrong:** `next.config.ts` defines only `images` and has no `async headers()`. A repo-wide grep for every security header returns nothing; there is no `vercel.json`, and `proxy.ts` returns a bare `NextResponse.next()`/`updateSession()` while the session helper only sets auth cookies. The app ships with browser-default headers.
**Why it matters:** The framable `/admin` panel performs destructive product/category/order mutations, so missing `X-Frame-Options`/`frame-ancestors` is a real clickjacking vector. Missing HSTS, nosniff, and CSP remove the standard baseline mitigations for a public site collecting PII (name/phone) and exposing auth. Medium because no single missing header is a standalone high-impact compromise, but clickjacking on a mutating admin plus PII collection is more than low.
**Fix:** Add `async headers()` for `source: '/(.*)'` returning at minimum `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), and a `Permissions-Policy`. Add a Content-Security-Policy as the strongest control (Next 16 supports nonce-based CSP via `proxy.ts`; start report-only if needed). Vercel will not add these automatically.

#### M3 (Storefront & SEO) — Homepage video uses a QuickTime `.mov` source with no fallback (won't play in Chrome/Firefox/Edge)
**Location:** `components/sections/HomeVideo.tsx:10-11, 53-68`
**What is wrong:** `VIDEO_SRC` defaults to `/PANTALLA%20POLAR%202.mov` (22 MB) and is served as a single `src` with no `<source type>` alternatives and no `onError`. The deployed config is also a `.mov`: `NEXT_PUBLIC_HOME_VIDEO_URL` points at a Supabase Storage URL ending `.mov` that the CDN serves with `Content-Type: video/quicktime`, which Chrome/Firefox/Edge cannot play (only old Safari supports `video/quicktime`).
**Why it matters:** On the dominant desktop/Android browsers the "Mira la experiencia Polar" section renders a non-playing black panel. With `autoPlay` + `preload="auto"` it also forces a 22 MB eager download (data + LCP cost) for a clip many users can't watch. Medium: user-visible across most browsers, but an isolated decorative section that does not break navigation/checkout/auth.
**Fix:** Transcode to web-standard H.264/AAC MP4 (and ideally WebM) served as `Content-Type: video/mp4`; use `<source>` elements (type `video/mp4`/none — **not** `video/quicktime`) with a graceful fallback; drop `preload="auto"` (use `metadata`/`none`). Verify playback in Chrome and Firefox, not only Safari.

#### M4 (React/Next.js) — ProductDetailModal is `aria-modal` but has no focus trap, initial focus, or focus restore
**Location:** `components/menu/ProductDetailModal.tsx:16-57` (effect `:22-36`; dialog `:45-47`)
**What is wrong:** The modal declares `role="dialog" aria-modal="true"` and locks body scroll + closes on Escape, but does no focus management: it never moves focus into the dialog, never traps Tab, and never restores focus to the trigger on close. It is rendered inline (`ProductCard.tsx:118-125`) with no `inert`/portal on the background, so the obscured `ProductCard` triggers (`ProductCard.tsx:45-51`, `role="button" tabIndex={0}`), nav, and footer stay in the tab order.
**Why it matters:** Keyboard and screen-reader users can Tab into hidden background controls while the dialog claims to be modal (violates the `aria-modal` contract / WCAG 2.4.3), and focus is lost to `<body>` on close. The codebase already does this correctly in `CartDrawer.tsx:46-101` + `inert` (`:127`), so the gap is an inconsistency, not a missing capability.
**Fix:** Mirror the `CartDrawer` pattern — on open capture `document.activeElement`, move focus to the dialog/close button, trap Tab within the container, and restore focus on unmount; or mark the background `inert` while open.

#### M5 (Order & Checkout) — `orderSchema.items` has no maximum array length (anon DoS amplification)
**Location:** `lib/validation/schemas.ts:60`
**What is wrong:** `items: z.array(orderItemSchema).min(1, ...)` has no `.max()` (inconsistent with `addressLines.max(6)` at `:150` and `openingHours.max(14)` at `:162`). `createOrder` is a Server Action (`lib/actions/orders.ts:1,59`) callable by the `anon` role with no rate limiting/captcha anywhere in the codebase. In DB mode each items element drives one iteration of the `create_order` SECURITY DEFINER loop performing `SELECT ... FOR UPDATE` + conditional `UPDATE products` (`supabase/migrations/0010_remove_promos.sql:69-112,127`).
**Why it matters:** One small unauthenticated request carrying tens of thousands of repeated valid product IDs forces that many locked reads/inserts/updates in a single transaction and bloats `order_items` — a low-effort denial-of-service / lock-contention vector against checkout. (Random-UUID payloads abort on the first not-found, but repeating a public, untracked-stock product loops unbounded.)
**Fix:** Bound the array, e.g. `z.array(orderItemSchema).min(1).max(50)`; de-duplicate `productId`s server-side; consider basic rate limiting on `createOrder`.

---

### Low

#### L1 (Database & RLS) — `anon` can insert junk orders directly, bypassing `create_order` validation
**Location:** `supabase/migrations/0002_rls.sql:61-66` (grant `0011_public_grants.sql:23-24`)
**What is wrong:** `orders_anon_insert` is `for insert to anon with check (true)` and is never tightened later (`0009_admin_rls.sql:39,53` explicitly leaves it intact). With the anon INSERT grant, an unauthenticated caller can POST directly to PostgREST `/rest/v1/orders` and create rows with arbitrary `customer_*`/`address`/`notes` and `total_cop = 0`, bypassing the `create_order` RPC's pricing/phone/inventory checks. The `0001` CHECK constraints (name≥2, phone≥7, total≥0, address-for-delivery) only block trivially empty rows; nothing requires the order to contain any items, and there is no rate limiting.
**Why it matters:** Unauthenticated spam/garbage-order flooding of the admin dashboard and orders list (`lib/queries/orders.ts:61-180`). Write-only (orders has no public SELECT), so no exfiltration or tampering with real orders — a hardening gap, not a confidentiality/integrity breach.
**Fix:** Drop `orders_anon_insert` and force all creation through the SECURITY DEFINER `create_order` RPC (the only path the app uses; it bypasses caller RLS so checkout is unaffected). If direct inserts must remain, revoke anon INSERT on `orders` and/or add Supabase-side rate limiting.

#### L2 (Database & RLS) — Blanket UPDATE/DELETE grant to `anon` on all public tables relies entirely on RLS having no permissive anon policy
**Location:** `supabase/migrations/0011_public_grants.sql:23-40`
**What is wrong:** `0011` grants `select, insert, update, delete on all tables in schema public to anon, authenticated` plus matching `ALTER DEFAULT PRIVILEGES`. Safety rests entirely on RLS: there is no anon UPDATE/DELETE policy anywhere (every `to anon` policy is SELECT or INSERT only), so the grants are currently inert. The structural risk is that any **new** table created later automatically inherits full anon DML and is exposed the instant RLS is forgotten or a permissive policy is added. (`config.toml:19-24` flips the auto-expose default to false on 2026-05-30 — an independent second safeguard.)
**Why it matters:** No current data exposure; a future-proofing hazard only. Two safeguards (RLS + API exposure) must both fail for a new table to be exploited.
**Fix:** Prefer least privilege — grant only what each role needs (SELECT to anon on read tables, INSERT only where required) rather than full DML + default privileges. At minimum keep a standing check that every new public table has RLS enabled before deploy; consider dropping the anon UPDATE/DELETE grants.

#### L3 (Database & RLS) — `gen_order_short_code()` has no pinned `search_path` and is executable by `anon`
**Location:** `supabase/migrations/0005_order_short_code.sql:21-35` (default `:44`; granted `0011:29-30`)
**What is wrong:** `gen_order_short_code()` is `language plpgsql` with no `set search_path`, unlike `create_order`/`validate_promo`/`is_admin`/`restock_on_order_cancel` (all pinned). It is SECURITY INVOKER, set as the `orders.short_code` DEFAULT (so it runs in the INSERT path and from `create_order`), and granted EXECUTE to anon/authenticated.
**Why it matters:** No concrete exploit — the body references only `pg_catalog` built-ins (`substr`/`floor`/`random`/`length`) which can't be shadowed, and the order path inherits the definer's pinned `search_path`. It is a Supabase `function_search_path_mutable` linter finding and an inconsistency; a future edit adding an unqualified reference could become hijackable.
**Fix:** Add `set search_path = pg_catalog, public` to match the rest of the schema, and consider not granting EXECUTE to anon (the column default runs regardless of grants).

#### L4 (Order & Checkout) — `orderItemSchema.qty` and numeric COP/sort fields have no upper bound (int4 overflow / unbounded totals)
**Location:** `lib/validation/schemas.ts:34` (qty), `:82` (priceCop), `:86` (sortOrder), `:89` (stockQty)
**What is wrong:** Merged from two findings. These fields use `z.number().int().positive()`/`.nonnegative()` with no `.max()`. `z.number().int()` correctly rejects NaN/Infinity/floats, but any value up to `MAX_SAFE_INTEGER` is accepted. `qty` is anon-writable via `createOrder`. In DB mode `order_items.line_total_cop = qty * unit_price_cop` and `orders.total_cop` are all int4 (`0001_init.sql:109,139,140`); the `create_order` RPC computes `v_line_total := price_cop * v_qty` as integer (`0010_remove_promos.sql:102`). For seed prices (18000), `qty ≥ 119,305` overflows int4 and Postgres raises "integer out of range", aborting the transaction. For untracked products (the seed/default state, `stock_qty IS NULL`) the stock guard (`0010:91`) is skipped, so nothing caps `qty` before overflow. In demo mode (`lib/actions/orders.ts:84-90`) the guard is likewise skipped and `lineTotal = priceCop * qty` is returned to the client unbounded.
**Why it matters:** An unauthenticated request can reliably abort order creation via integer overflow (self-inflicted, transactional rollback — no persisted corruption, no oversell), and a `qty` just below the threshold persists a junk order with an inflated total. Demo-mode totals are cosmetic/self-inflicted. Admin price/sort fields are trusted but uncapped. Robustness gap on a public input; integer-safe and overflow-checked downstream.
**Fix:** Add sane `.max()` bounds — `qty` `.min(1).max(99)`, `priceCop` ~`100_000_000`, `stockQty`/`sortOrder` ~`1_000_000` — keeping totals comfortably inside int4.

#### L5 (Order & Checkout) — No length caps on anonymous, persisted order text fields (`customerName`/`address`/`notes`)
**Location:** `lib/validation/schemas.ts:39,57,59`
**What is wrong:** `customerName` (min 2, no max), `address` (optional, no max), `notes` (optional, no max) have no upper length bound. `createOrder` is anon-reachable; in DB mode the `create_order` RPC only `btrim`s these and inserts into `orders`, whose `customer_name`/`address`/`notes` are unbounded `text` with only lower-bound checks (`0001_init.sql:103-107`). RLS permits anon inserts by design.
**Why it matters:** An unauthenticated user can persist oversized junk strings on every order with no auth or rate limit at this layer → DB bloat / cost. Bounded in practice by Next.js's default 1 MB `serverActions.bodySizeLimit` (no override in `next.config.ts`), and rendered with React JSX escaping in admin views — so resource-abuse, not XSS.
**Fix:** Add `.max()` caps in the Zod schemas (e.g. customerName 80, address 200, notes 500; also product name 120, description 2000, and a `.max()` on each `addressLines`/`openingHours` string). Optionally mirror with `char_length` constraints on the DB columns.

#### L6 (Security & Auth) — Image upload performs no content-type/size/extension validation; buckets have no limits
**Location:** `lib/storage.ts:21-50` (buckets `supabase/migrations/0007_site_config.sql:98-102`)
**What is wrong:** `uploadPublicImage` accepts any `File`, sets `contentType: file.type || undefined` (attacker-controlled), and performs no size/MIME/extension check; `safeFileName` only sanitizes the display name and preserves the attacker's extension. The buckets are created `public = true` with no `file_size_limit`/`allowed_mime_types` (per-bucket config in `config.toml:121-124` is commented out; only a global 50 MiB cap). `getPublicUrl` returns a permanent public URL, and the downstream guard (`schemas.ts:11-25`) re-validates only the host, so a maliciously-typed object passes.
**Why it matters:** An authenticated panel admin (including a non-super `admin`) can upload e.g. an SVG/HTML object with `content-type` forced to `text/html` and get a stable URL on the `*.supabase.co` domain — content hosting / SVG-XSS on a trusted-looking host (a **different** origin from the Vercel app, so not same-origin XSS against app sessions), plus unbounded storage consumption. Bounded to trusted admins.
**Fix:** Enforce at the bucket (set `file_size_limit` + `allowed_mime_types` = `image/png,image/jpeg,image/webp,image/avif` in a migration) **and** in `uploadPublicImage` (check `file.size`, reject if `file.type` not in an image allow-list, derive `contentType` from the validated type, restrict the object-key extension). Consider signed URLs or a forced `Content-Disposition` to prevent inline HTML/SVG rendering.

#### L7 (Security & Auth) — Image/asset URLs allow any `*.supabase.co` host (open image-proxy via the optimizer; not pinned to project ref)
**Location:** `lib/validation/schemas.ts:22-24` (mirrored in `next.config.ts:7`)
**What is wrong:** `isAllowedImageUrl` accepts any host that is `supabase.co` or ends in `.supabase.co`, so it permits arbitrary Supabase projects (e.g. `https://attacker-project.supabase.co/...`), not just this app's ref. `next.config.ts` mirrors this with `remotePatterns: [{ hostname: "**.supabase.co" }]`, so `/_next/image` will server-side fetch and proxy images from any `supabase.co` subdomain. The validated URL flows into `next/image` (`Footer.tsx:148-149`) and a raw `<img>` (`BrandingManager.tsx:130`).
**Why it matters:** A panel admin can point a product/asset image at a third-party Supabase project and have this app's optimizer fetch it (mild image-proxy/SSRF, content attribution/bandwidth). Admin-gated (`requireAdmin()` + RLS) and constrained to `*.supabase.co` (cannot reach localhost/internal IPs/metadata), so impact is limited; the host check is just broader than the documented intent.
**Fix:** Pin the allow-list to the exact host derived from `NEXT_PUBLIC_SUPABASE_URL` in both `isAllowedImageUrl` and `next.config` `remotePatterns`.

#### L8 (Order & Checkout) — Integer COP/quantity/sortOrder fields have no upper bound (correctness)
> **Note:** merged into **L4** (same `lib/validation/schemas.ts` fields and root cause). See L4 for the consolidated finding and fix.

#### L9 (Server Actions) — `site.ts`/`auth.ts` call `requireAdmin()`/`createClient()` before the `hasSupabaseEnv()` guard (throws in demo mode instead of degrading gracefully)
**Location:** `lib/actions/site.ts:21-26, 74-79`; `lib/actions/auth.ts:27-32`
**What is wrong:** In `upsertSiteAsset`, `updateShopSettings`, and `changePassword`, `requireAdmin()` runs **before** `hasSupabaseEnv()`. `requireAdmin()` → `createClient()` → `createServerClient(undefined, undefined)` in demo mode, and `@supabase/ssr` throws synchronously ("Your project's URL and Key are required..."). So the carefully-written `{ ok: false, error: "Configura Supabase para guardar cambios." }` branches are dead code. The other four action files (orders/products/categories/admins) check `hasSupabaseEnv()` first, confirming the intended contract.
**Why it matters:** A direct/replayed POST to these actions on a no-Supabase deployment produces a generic Server Action 500 instead of the designed graceful result. It fails closed (no security exposure; throw is before any privileged op) and the admin UI normally gates these — so the defect is the broken demo-vs-DB graceful-degradation contract and the unreachable error strings.
**Fix:** Reorder so `hasSupabaseEnv()` is checked before `requireAdmin()` in all three functions, matching `orders.ts`/`products.ts`/`categories.ts`/`admins.ts`.

#### L10 (Server Actions) — Update/delete actions report `ok: true` even when no row matched (silent no-op on stale id)
**Location:** `lib/actions/products.ts:119-129, 147-157`; `lib/actions/categories.ts:88-101, 115-125`; `lib/actions/orders.ts:202-214`
**What is wrong:** `updateProduct`, `deleteProduct`, `updateCategory`, `deleteCategory`, and `updateOrderStatus` issue `.update()/.delete().eq("id", id)` without `.select()` and only branch on `error`. PostgREST returns no error and an empty result when zero rows match (stale/already-deleted id), so each returns `{ ok: true }`; the UI then shows a success toast / `router.refresh()` for a write that did not happen. (Note: the RLS-filtering rationale in the original report does not apply — `is_admin()` is table-wide and mirrors `requireAdmin()`, so RLS cannot silently drop a row the app guard already passed; the only real trigger is a concurrent/stale id.)
**Why it matters:** A stale id (row deleted in another tab / concurrent delete) yields a false success, masking the failure. No data corruption; ids come from server-rendered lists so it's an edge case, and the immediate refresh self-corrects on next render.
**Fix:** Add `.select("id")` (or read the affected-row count) and return `{ ok: false, error: "No se encontró el registro." }` when zero rows are affected.

#### L11 (Server Actions) — `deleteCategory` swallows every error into a guessed "has associated products" message
**Location:** `lib/actions/categories.ts:115-123`
**What is wrong:** `deleteCategory` catches any non-null `error` and always returns "No pudimos eliminar la categoría (puede tener productos asociados)." The real FK-conflict case is code `23503` (`products.category_id ... on delete restrict`, `0001_init.sql:72`). The helper `isForeignKeyViolation` exists (`lib/auth.ts:92`) and `deleteProduct` (`products.ts:149`) uses it — but `categories.ts` imports only `requireAdmin, isUniqueViolation`.
**Why it matters:** A transient/permission/connection error is misreported as a product-association conflict, sending the admin to chase nonexistent products. Cosmetic, but inconsistent with the parallel `deleteProduct` handling.
**Fix:** Mirror `deleteProduct`: import `isForeignKeyViolation`, branch on it for the "tiene productos asociados" message, and fall back to a generic "No pudimos eliminar la categoría." for other errors.

#### L12 (Data & Demo-mode) — Public products read has no stable tiebreaker on `sort_order` (non-deterministic ordering)
**Location:** `lib/queries/menu.ts:118` (admin `app/(admin)/admin/_lib/queries.ts:82`)
**What is wrong:** `getCachedProducts` orders by `.order("sort_order", { ascending: true })` only. Postgres does not guarantee a stable order for rows sharing a `sort_order`, so tied products can swap across cache regenerations (`revalidate: 3600`) or server instances. The column is non-unique (`0001_init.sql:81,88-89`) and nothing prevents an admin saving two products with the same `sort_order` (`schemas.ts:86`, no uniqueness). Seed data has unique values, so only DB mode flickers.
**Why it matters:** Grid ordering can change unpredictably between loads in DB mode for products that share a `sort_order` — a subtle divergence from the always-stable seed ordering. Cosmetic only.
**Fix:** Add a deterministic secondary sort, e.g. `.order("sort_order", { ascending: true }).order("name", { ascending: true })` (or by `id`), in both `getCachedProducts` and the admin product list.

#### L13 (Data & Demo-mode) — `formatCop` does not guard non-finite or non-integer input
**Location:** `lib/format.ts:11-13`
**What is wrong:** `formatCop` passes its argument straight to `Intl.NumberFormat`. Verified: `formatCop(NaN)` → `"$NaN"`, `Infinity` → `"$∞"`, `1234.56` → `"$1.235"` (silent rounding, contradicting the integer-COP invariant), `-0` → `"-$0"`. All current call sites pass validated integers (DB `integer` columns, Zod-validated, server-recomputed totals), so it is not currently exploitable; the one weakly-guarded path is hand-tampered `localStorage` (`CartProvider.tsx:120-127`), which is cosmetic and self-inflicted (server re-prices).
**Why it matters:** The single shared money-rendering primitive silently produces nonsense or silently rounds instead of failing loudly — a latent correctness hazard if any future caller passes a derived/unvalidated number.
**Fix:** Coerce defensively, e.g. `const safe = Number.isFinite(n) ? Math.round(n) : 0;` before formatting (or assert integer in dev).

#### L14 (Storefront & Cart) — Cart stores a price snapshot that is never reconciled with the catalog (displayed total can diverge from charged total)
**Location:** `components/cart/CartProvider.tsx:29-57, 112-131, 142-144, 157-176`
**What is wrong:** On ADD the cart copies `unitPriceCop`/`name`/`imageUrl`/`accentColor` into the `CartItem` and persists to `localStorage`; HYDRATE restores them verbatim with no re-read of the live catalog (grep confirms no reconciliation in `components/cart` or `components/checkout`). The subtotal and all display surfaces (`CartDrawer.tsx:215,277`, `CheckoutForm.tsx:326,360,379,387`) render the stale `unitPriceCop`. The server is authoritative and recomputes from current price (`0010_remove_promos.sql:78-122`, `lib/actions/orders.ts:90-98`).
**Why it matters:** In DB mode, if an admin changes a price while the item sits in a cart, the cart/checkout summary show the **old** price. No money is mischarged (server recomputes). The original report's "different total in confirmation/WhatsApp" and "stale name sent" claims are **refuted**: the order page shows no total to anon customers (RLS), and the WhatsApp message is built from the server-trusted summary (`whatsapp.ts:53-61`), so it is correct. The residual issue is purely the pre-submit drawer/summary showing an outdated price until the item is re-added.
**Fix:** On hydrate (and ideally on menu/checkout mount) reconcile cart items against the freshly loaded catalog: drop items whose product no longer exists/inactive, and refresh `unitPriceCop`/`name`/`imageUrl` from the live `Product` before computing the displayed subtotal.

#### L15 (Storefront & Cart) — `loadFromStorage` accepts non-positive, fractional, or NaN `qty` and arbitrary `unitPriceCop`
**Location:** `components/cart/CartProvider.tsx:120-127`
**What is wrong:** The defensive filter only checks `typeof item.unitPriceCop === "number"` / `typeof item.qty === "number"` — it does not require `qty` to be a positive integer or `unitPriceCop` a finite non-negative integer (note `typeof NaN === "number"`). A hand-edited/legacy `localStorage` entry like `{qty: -3 | 2.5 | NaN}` passes, producing negative/fractional/`$NaN` subtotals (`:158-162`), and a `NaN` qty sticks on the steppers (SET_QTY removes only when `qty <= 0`).
**Why it matters:** Purely cosmetic, self-inflicted UX corruption — `orderItemSchema` (`:34`) rejects bad `qty` at submit, only `{productId, qty}` is sent, and the server re-prices, so no money/integrity impact. The badge actually hides for bad counts (`Navbar.tsx:35` guards `itemCount > 0`), and the item is recoverable via the trash button.
**Fix:** Tighten the filter: `Number.isInteger(item.qty) && item.qty > 0` and `Number.isFinite(item.unitPriceCop) && item.unitPriceCop >= 0`; clamp/coerce `qty` with `Math.max(1, Math.floor(qty))` on load and drop items that fail.

#### L16 (Storefront & Cart) — Cart has no client-side stock cap; quantity can exceed `stockQty` and only fails with a generic error at checkout
**Location:** `components/cart/CartDrawer.tsx:242-249` (also `CheckoutForm.tsx:347-354`, `ProductCard.tsx:21,26`)
**What is wrong:** Add/increment never consult `stockQty`. `ProductCard` blocks add only when fully `soldOut` (ignores limited stock); the `+` buttons call `setQty(qty+1)` with no upper bound; `CartItem` carries no `stockQty` and the reducer clamps only the lower bound. The server is authoritative (RPC locks `FOR UPDATE` and raises `insufficient_stock`, surfaced generically at `orders.ts:143-148`), so this is **not** an oversell.
**Why it matters:** A customer can build a cart above available stock, fill out the whole form, and only at submit get a generic "No hay suficiente stock de uno de los productos" with no indication of which product or how many remain. Inert in demo mode (no seed product sets `stockQty`); only reachable in DB mode for products with finite stock.
**Fix:** Thread `stockQty` into `CartItem` (or look it up) and cap/disable the increment buttons at available stock; clamp on add; surface a "solo N disponibles" hint before checkout.

#### L17 (Storefront & SEO) — Category filter that yields zero products renders an empty grid with no "no results" message
**Location:** `components/menu/ProductGrid.tsx:8-16` (filter `components/sections/Sabores.tsx:19-23`)
**What is wrong:** `ProductGrid` maps products to cards with no empty-state branch; `Sabores` passes the (possibly empty) filtered array straight through. Categories and products filter on `is_active` independently (`menu.ts:78` vs `:117`), and admin actions set the two flags independently, so in DB mode an active category whose products are all inactive shows a selected tab over a blank region. Seed data always has products per category, so demo/build are unaffected.
**Why it matters:** Minor UX dead-end in DB mode; the user sees the category selected but an empty area with no explanation. No correctness/build impact.
**Fix:** Render a small empty-state message (e.g. "No hay sabores en esta categoría.") in `ProductGrid` (or `Sabores`) when `products.length === 0`.

#### L18 (Storefront & Cart) — No cross-tab cart synchronization; concurrent tabs overwrite each other's cart
**Location:** `components/cart/CartProvider.tsx:148-155`
**What is wrong:** The provider persists `state.items` on every change but never listens for the `storage` event and hydrates only once on mount. Two open tabs hold independent in-memory carts; whichever mutates next writes its divergent state over the other tab's persisted cart (last-writer-wins).
**Why it matters:** A user with two tabs open can silently lose items added in the other tab. Edge case for a single-device checkout flow; no integrity/security impact (order totals are server-recomputed), and the dropped item is re-addable.
**Fix:** Add a `window` `storage` listener keyed on `STORAGE_KEY` that re-hydrates (dispatch `HYDRATE`) when another tab writes, so tabs converge.

#### L19 (Admin UI) — `OrderStatusControl` rollback reverts to a stale `current` prop after a failed update
**Location:** `app/(admin)/admin/_components/OrderStatusControl.tsx:19, 23-37`
**What is wrong:** `value` is seeded once with `useState<OrderStatus>(current)` and never re-synced (no `useEffect`). On a failed `updateOrderStatus`, the rollback `setValue(current)` uses the **render-closure** `current`; if server truth advanced underneath (another admin/tab + a refresh) the rollback writes the old value, so the pill disagrees with the `StatusBadge` rendered from server data on the same page.
**Why it matters:** After a failed status change on a concurrently-edited order, the selector can show a value that doesn't match what's stored. Reaching it requires concurrent external edit + a transient server failure + no remount; there is no auto-refresh/polling here (the only `router.refresh()` is the component's own post-success call), buttons are `disabled={pending}`, and it self-heals on the next action/navigation — so it is a narrow hygiene smell.
**Fix:** Add `useEffect(() => setValue(current), [current])` (or track the last server-confirmed status via a ref) so the control re-syncs on every refresh and the rollback always reverts to authoritative truth.

#### L20 (Admin UI) — `BrandingManager` href input does not re-sync to server value after save/refresh
**Location:** `app/(admin)/admin/_components/BrandingManager.tsx:77, 81-95, 180`
**What is wrong:** `hrefValue` is seeded once with `useState(href)` and never reconciled (no `useEffect`); `AssetCard` is keyed on the stable `slot`, so it does not remount on `router.refresh()`. After a successful `upsertSiteAsset`, the refreshed (trimmed/normalized) `href` prop is ignored and the controlled input keeps the locally-typed string until a full reload. The only normalization is `.trim()`/empty→null (`schemas.ts:120-126`), so the drift is limited to surrounding whitespace and affects only Instagram slots (the only ones with the href input).
**Why it matters:** Cosmetic display drift between the field and the stored value; can make an admin think an edit didn't take. Server value is authoritative; no data corruption.
**Fix:** Add `useEffect(() => setHrefValue(href), [href])` (or key `AssetCard` on `slot+url+href`).

#### L21 (Admin UI) — Orders list does not clamp an out-of-range `page` param
**Location:** `app/(admin)/admin/(shell)/orders/page.tsx:53, 55-67, 174-176` (`lib/queries/orders.ts:134,176`)
**What is wrong:** `requestedPage` is `Math.max(1, parseInt(page))` with no upper bound, and `getOrdersPage` echoes it back unclamped. On the project's PostgREST stack an out-of-range `.range()` returns HTTP 200 with `data=[]` and a `count`, so the empty-page short-circuit (`orders.ts:165-168`, only on `error || !data`) is skipped. Navigating to `/admin/orders?page=999` yields `currentPage=999`, an empty list, `hasNext=false`, `hasPrev=true` — rendering the empty-state copy and "Página 999 de N" while the header still shows the real total.
**Why it matters:** A bookmarked/edited/over-paginated URL shows an empty list with a nonsensical label that contradicts the header count. Admin-only, requires a hand-edited URL (the pager steps ±1 and disables at boundaries); purely cosmetic.
**Fix:** Clamp the served page in `getOrdersPage` (e.g. `requestedPage = Math.min(requestedPage, Math.max(1, pageCount))` after computing `total`), or redirect to the last page when the requested page exceeds it.

#### L22 (Admin UI) — Dashboard loads every order row unbounded to compute aggregates
**Location:** `app/(admin)/admin/(shell)/page.tsx:27-50` (`lib/queries/orders.ts:61-85`)
**What is wrong:** The `force-dynamic` dashboard calls `getOrders()` (no limit, no `.range()`) to derive counts, a status histogram, total/30-day revenue, and the 8 most recent rows — materializing the full `orders` table in Node on every load. The orders list page already uses the paginated `getOrdersPage`, so the unbounded read is dashboard-specific.
**Why it matters:** As order volume grows this becomes a slow, memory-heavy query on every dashboard load. Functionally correct and low-risk today (single-admin tool, 10 narrow columns, no joins), but does not scale.
**Fix:** Compute aggregates with SQL (PostgREST `count`/`head` per status, sum via RPC) and fetch only the recent rows with `.limit(8)`, instead of loading all orders into the process.

#### L23 (Storefront & SEO) — Sitemap omits `/nosotros`, `/contacto`, `/ubicacion` (indexable pages not discoverable)
**Location:** `app/sitemap.ts:7-19`
**What is wrong:** `sitemap()` returns only `/` and `/menu` (verified against the generated `.next/server/app/sitemap.xml.body`). The three `app/(site)/{nosotros,contacto,ubicacion}` pages are statically prerendered, each set a canonical, inherit `robots: { index: true, follow: true }` (`app/layout.tsx:47`), and are linked from `NAV_LINKS`/footer — fully indexable but absent from the XML sitemap that `robots.ts` advertises as canonical.
**Why it matters:** Three indexable, link-worthy pages (About/Contact/Location — the latter two carry local-SEO/NAP value for the Tuluá shop) are missing, weakening crawl discovery/prioritization. Internally linked, so not blocked from indexing — an SEO-completeness gap.
**Fix:** Add entries for `${base}/nosotros`, `${base}/contacto`, `${base}/ubicacion` (e.g. priority ~0.6, `changeFrequency: 'monthly'`), and keep the list in sync with `NAV_LINKS`.

#### L24 (Storefront & SEO) — Placeholder WhatsApp number is surfaced to users even though JSON-LD deliberately suppresses it
**Location:** `app/(site)/contacto/page.tsx:61-67, 125-167` (also `Hero.tsx:148`, `InfoRow.tsx:55,121`, `MobileBottomNav.tsx:91`)
**What is wrong:** `JsonLd.tsx:6-8,40-43` intentionally omits `telephone` while `whatsappNumber === '573000000000'` (the placeholder default, `lib/config.ts:2` / `seed-data.ts:182`). The visible UI applies no such guard: `formatPhone('573000000000')` renders the clickable "+57 300 000 0000", and `whatsappUrl(...)` builds `wa.me/573000000000` links across the storefront. In demo mode or any DB-mode deploy before `shop_settings` is configured, real visitors see and can click a fake number / dead WhatsApp CTA.
**Why it matters:** The placeholder the code is careful to hide from Google is shown to humans, presenting a bogus contact number and broken ordering CTA (the primary conversion path) on a pre-configuration deploy. Self-limiting (auto-resolves once a real number is set) and the value is obviously fake, so low.
**Fix:** Centralize an `isPlaceholderWhatsapp(number)` check and reuse it in the UI — hide the formatted phone label and disable/neutralize the WhatsApp CTAs when the number is still the placeholder, mirroring the JSON-LD suppression. At minimum gate the `contacto` phone label and links.

#### L25 (Storefront & SEO) — Home autoplay video lacks captions/track
**Location:** `components/sections/HomeVideo.tsx:53-80`
**What is wrong:** The `<video>` autoplays muted with `controls` but has no `<track kind="captions">`, no `aria-label`, and no transcript; no `.vtt`/`.srt` assets exist. The only a11y affordance is the labeled "Activar sonido" button.
**Why it matters:** Minor WCAG 1.2.x gap **if** the clip carries meaningful spoken audio. All evidence (asset name "PANTALLA POLAR", muted autoplay loop, marketing copy) indicates a decorative ambient brand loop, for which captions are largely not required — so this is conditional and low.
**Fix:** If the clip carries meaningful audio, add a `<track kind="captions" srclang="es">` (or a visible caption/transcript). If purely decorative, that's acceptable — document it and consider an `aria-label` on the video so its purpose is announced.

#### L26 (Type Safety) — Unvalidated cast of `sessionStorage` JSON can crash the order confirmation page at render
**Location:** `components/order/WhatsAppHandoff.tsx:36-50` (render `:53-54`)
**What is wrong:** The persisted summary is `JSON.parse(raw) as { orderId; summary: WhatsAppOrderSummary }` and accepted on a truthiness-only gate (`stored?.orderId === orderId && stored.summary`) before `setSummary`. The try/catch wraps only the effect; the render-path `href = summary ? buildWhatsAppLink(summary) : ...` runs **outside** it, and `buildWhatsAppMessage` does `for (const l of o.lines)` (`whatsapp.ts:84`). A truthy-but-partial `summary` (missing `lines`) throws "is not iterable" synchronously in render.
**Why it matters:** A malformed/tampered `polar_last_order:v1` value crashes the client render of `/order/[id]` (caught by the route error boundary) instead of degrading to the generic WhatsApp link the catch was designed to provide. Self-inflicted (same-origin sessionStorage), not reachable by a normal checkout (the sole writer always serializes a well-formed summary), and contained to one route — so low.
**Fix:** Validate the parsed shape before trusting it — guard `Array.isArray(stored?.summary?.lines)` (and ideally numeric fields), or reuse a small Zod schema; on failure fall through to the generic link rather than setting a partial summary.

#### L27 (Type Safety) — Cart hydration type guard omits fields its predicate claims (`accentColor`, `imageUrl`)
**Location:** `components/cart/CartProvider.tsx:120-127`
**What is wrong:** `loadFromStorage` filters with a predicate typed `(item): item is CartItem` but only checks `productId`/`name`/`unitPriceCop`/`qty` — not `accentColor: string` or `imageUrl: string | null` (`lib/types.ts:24-31`). An item missing those is unsoundly asserted to be a full `CartItem`. Worst case is sharper than reported: a missing `accentColor` reaches `lighten(undefined, 0.6)` → `hex.trim()` in `PlaceholderCup.tsx:14` and throws a `TypeError` during render (crashing the cart drawer / checkout list), not merely a cosmetic glitch.
**Why it matters:** The app has always written complete items (verified via git history), so this is reachable only via hand-edited/corrupted `localStorage` — no app-driven trigger, no financial/auth/control-flow impact. Low.
**Fix:** Add `typeof item.accentColor === "string"` and an `imageUrl` (string|null) check to the predicate, or normalize on read (default `accentColor`, coerce `imageUrl` to `null`) so the asserted type is actually satisfied.

---

### Info

#### I1 (Database & RLS) — Trigger/utility functions without a pinned `search_path` (`set_updated_at`, and see L3)
**Location:** `supabase/migrations/0001_init.sql:36-44`
**What is wrong:** `set_updated_at()` is `language plpgsql` with no `set search_path`, wired as a BEFORE UPDATE trigger on `categories`/`products`/`orders`/`promos`/`site_assets`/`shop_settings`. It is SECURITY INVOKER and only assigns `new.updated_at = now()` (`now()` resolves from `pg_catalog` regardless of search_path), so there is no hijack vector — it is the remaining function flagged by the `function_search_path_mutable` advisor and inconsistent with the pinned SECURITY DEFINER functions.
**Why it matters:** No exploit (invoker rights, trivial body). Pure hardening/lint consistency.
**Fix:** Optionally add `set search_path = pg_catalog, public` to clear the advisor and keep all functions uniform. (Pair with the L3 fix for `gen_order_short_code`.)

#### I2 (Security & Auth) — Customer name/address/notes are unbounded and not newline-sanitized before WhatsApp message assembly
**Location:** `lib/whatsapp.ts:71-97`
**What is wrong:** `buildWhatsAppMessage` interpolates `customerName`/`address`/`notes` into a newline-joined body. The schema only `.trim()`s these (no interior-newline strip, no max length), so a customer can embed literal newlines and a fake "Total:" line into **their own** message. The full string passes through `encodeURIComponent` (`config.ts:69`), so there is no wa.me URL/parameter injection, and all amounts come from the server-trusted `OrderSummary`. The admin path interpolates only `customerName` via `encodeURIComponent` and renders fields as auto-escaped React text — no XSS.
**Why it matters:** Cosmetic self-spoofing of the customer's own outbound message; the shop should reconcile against the persisted order, not the message text. Below low.
**Fix:** Strip control chars / collapse newlines and cap length on these fields in `orderSchema` (e.g. `.max(80)`/`.max(200)` and `replace(/[\r\n]/g, ' ')` in the builder); reconcile on the shop side via `short_code`.

#### I3 (Security & Auth) — `changePassword` updates the password without verifying the current password
**Location:** `lib/actions/auth.ts:24-49`
**What is wrong:** `changePassword` authorizes via `requireAdmin()` (JWT-validated, scoped to the acting user) then calls `supabase.auth.updateUser({ password })` with no re-verification of the existing password — Supabase's standard self-service flow, consistent with `resetAdminPassword` (`admins.ts:169-171`).
**Why it matters:** No remote auth bypass and no IDOR (a session can only change its own password). The only threat model is an already-authenticated, unlocked machine, where the attacker already holds full admin capability. Observation, not a defect.
**Fix:** Optional step-up — require the current password and re-authenticate (`signInWithPassword`) before `updateUser`, if desired. Otherwise no change needed.

#### I4 (React/Next.js) — HomeVideo: enable-sound handler state divergence and double invocation
**Location:** `components/sections/HomeVideo.tsx:21-34, 74-75`
**What is wrong:** Merged from two findings on the same handler. (a) `handleEnableSound()` sets `video.muted = false; video.volume = 1` before `await video.play()`; the catch only does `setSoundEnabled(false)` and never restores `video.muted = true`, leaving a momentary element/state mismatch on the play()-rejection path (though a rejected play leaves the element paused/silent, and the `onPause`/`onVolumeChange` → `syncSoundState` handlers re-sync, so the "audible overlay" outcome does not actually materialize). (b) The same handler is bound to **both** `onClick` and `onPointerDown`, so a click fires it twice; the handler is idempotent and `soundEnabled` has no side-effecting consumers, so the double-fire has no observable effect.
**Why it matters:** At most a brief, self-correcting cosmetic divergence plus a redundant idempotent call on a single decorative video. No data/security/functional impact.
**Fix:** In the catch, also revert the mutation (`catch { video.muted = true; setSoundEnabled(false); }`), and drop `onPointerDown` (`onClick` already satisfies the user-gesture requirement) to make the unmute path single-shot.

#### I5 (Admin UI) — `AdminsManager` "Contraseña" toggle and create inputs are not disabled during an in-flight action
**Location:** `app/(admin)/admin/_components/AdminsManager.tsx:24, 129-141, 197-214`
**What is wrong:** A single `useTransition` `pending` flag governs every row. The mutating buttons (delete/create/reset submit) are correctly `disabled={pending}`, but the per-row "Contraseña" toggle and the new-admin email/password inputs are not — they only mutate local state and invoke no server action. Every mutation re-checks `requireSuperAdmin()` server-side.
**Why it matters:** Cosmetic only — the UI doesn't fully freeze during an in-flight action; no double-mutation or auth bypass is possible.
**Fix:** Optionally disable the toggle and create inputs while `pending` for a consistent busy state. Not required for correctness.

#### I6 (React/Next.js) — `siteUrl()` falls back to `http://localhost:3000` on non-Vercel production builds
**Location:** `lib/seo.ts:16-26`
**What is wrong:** `siteUrl()` throws only when `VERCEL === '1'`. On any non-Vercel production build with no `NEXT_PUBLIC_SITE_URL`/`VERCEL_*_URL`, it warns and returns `http://localhost:3000`, which then flows into `metadataBase`, every canonical, `openGraph.url`, `robots.ts`, `sitemap.ts`, and both JSON-LD components. The localhost fallback is a documented deliberate choice so the zero-env `pnpm build` seed correctness gate does not throw.
**Why it matters:** Near-zero practical risk: the deploy target is unambiguously Vercel (where `VERCEL="1"` always triggers the loud throw), and `NEXT_PUBLIC_SITE_URL` is already documented as required for Production. Reaching the bad state requires deploying off the supported Vercel path **and** omitting a documented-required var, with a warning logged.
**Fix:** Document that non-Vercel deploys MUST set `NEXT_PUBLIC_SITE_URL` (the suggested "throw when `NODE_ENV==='production'`" would break the mandated zero-env build gate, so prefer documentation here).

#### I7 (Type Safety) — `tsconfig` lacks `noUncheckedIndexedAccess` (and other strictness flags)
**Location:** `tsconfig.json:2-24`
**What is wrong:** `strict: true` is on, but `noUncheckedIndexedAccess` is not, so `category[0]`, `addressLines[0]`, `issue.path[0]` are typed non-undefined even though they can be `undefined`. Every such site is already manually guarded (`?? null`, `?? "Tuluá"`, `as ... | undefined`) and `tsc --noEmit` passes — so no active bug, but the type system isn't enforcing the discipline. `noImplicitOverride`/`noUnusedLocals`/`exactOptionalPropertyTypes` are likewise off.
**Why it matters:** Latent only — a future unguarded array access would type-check yet be `undefined` at runtime.
**Fix:** Consider enabling `noUncheckedIndexedAccess` (and optionally `noImplicitOverride`); expect a small number of new errors at already-guarded sites needing explicit narrowing — a low-cost hardening.

#### I8 (Type Safety) — `create_order` RPC result cast (`as CreateOrderRpcResult`) is unvalidated
**Location:** `lib/actions/orders.ts:153-165`
**What is wrong:** `supabase.rpc("create_order", ...)` returns a loose type (clients have no `<Database>` generic) and is cast directly with no schema validation, then mapped. The RPC contract matches today (`0006_review_fixes.sql:206-213` builds exactly that shape, and the only iteration is `(r.items ?? [])`-guarded). Amounts stay server-trusted (recomputed in SQL), so this is not a price-trust issue.
**Why it matters:** No realistic runtime failure today; the residual risk is that a future migration changing the RPC's return shape would silently break the mapping with no type error (the cast suppresses it).
**Fix:** Optionally parse `rpcResult` with a small Zod schema mirroring `CreateOrderRpcResult` and fall back to the generic error on parse failure, so a drifted RPC contract surfaces as a handled error.

#### I9 (Code Quality) — Stale comment claims `requireAdmin` uses `ADMIN_EMAIL` (mechanism removed)
**Location:** `lib/actions/orders.ts:172-177` (also `scripts/create-admin-user.mjs:8-9`)
**What is wrong:** The `updateOrderStatus` doc comment says the action is gated "when `ADMIN_EMAIL` is set, the admin identity". That env-allowlist path no longer exists — `requireAdmin()` (`lib/auth.ts:43-58`) authorizes purely on `isSuperAdmin(email)` (`SUPER_ADMIN_EMAIL`) OR `app_metadata.role in {admin, super_admin}`, and no code reads `ADMIN_EMAIL` (`SETUP.md:146-147` confirms it is no longer read). `create-admin-user.mjs:8-9` carries the same incorrect instruction (its own runtime output already prints the correct `set-admin-role.mjs` guidance). (The same staleness also appears in `README.md` and `LAUNCH_RUNBOOK.md`.)
**Why it matters:** No security impact (the runtime guard is correct and fails closed). Operational risk: an operator following the script would set a non-existent var and find the new admin still can't use `/admin`, or misunderstand the trust model during an incident.
**Fix:** Update the comment to describe the current model (super-admin email or `app_metadata.role` claim), and fix the script to instruct running `scripts/set-admin-role.mjs <email> admin` (or creating admins in-app at `/admin/admins`).

#### I10 (Code Quality) — `inputClass` form-input Tailwind string duplicated across 6 files
**Location:** `components/checkout/CheckoutForm.tsx:408-416` + `ProductForm.tsx:452-458`, `CategoriesManager.tsx:309-312`, `SettingsManager.tsx:390-394`, `AdminsManager.tsx:300-303`, `BrandingManager.tsx:224-228`
**What is wrong:** The same input-field class string (height/border/bg/focus-ring literals) is redefined locally in 6 files — the exact pattern the project standardizes via global component classes in `app/globals.css` (`.btn-brand`/`.pill-active`/etc.), where there is no `.input-polar`. Drift has already begun (token ordering and disabled-variant differences).
**Why it matters:** Any tweak to the input look must be edited in 6 places and will diverge; contradicts the documented styling convention. Maintainability only.
**Fix:** Add a global `.input-polar` (with error/disabled variants) in `app/globals.css`, or export a single shared `inputClass(hasError?, disabled?)` helper.

#### I11 (Code Quality) — Error-alert and amber "not configured" banner markup copy-pasted across ~7 sites each
**Location:** `app/(admin)/admin/_components/SettingsManager.tsx:154-169` + 6 other admin pages
**What is wrong:** The red error banner (`role=alert`, fixed rgba border/bg/text classes) appears ~7×, and the amber "Base de datos no configurada" banner appears in 7 admin pages, with no shared component. Divergence already exists (success banner uses two different green tints: `rgba(74,222,128)` vs `rgba(63,181,138)`).
**Why it matters:** High-volume duplicated presentational markup; role/visual changes must be repeated 7× and tend to diverge. Maintainability only.
**Fix:** Extract small shared `<Alert tone="error|success|warning">` and a `<DemoModeNotice>` component and reuse them.

#### I12 (Code Quality) — Admin active-pill gradient reinvented 5× instead of reusing `.pill-active`
**Location:** `app/(admin)/admin/_components/OrderStatusControl.tsx:53-58` + `OrderStatusFilter.tsx:38-43`, `AdminNav.tsx:56-61`, `BrandingManager.tsx:158`, `CheckoutForm.tsx:185-190`
**What is wrong:** `bg-[linear-gradient(105deg,#a749c5,#9128da)]` + shadow is hand-written in 5 spots — a near-clone of the global `.pill-active` (gradient `#9128da→#7c1fc4`, `globals.css:142`). The gradients and shadow alphas differ, so admin pills and storefront pills (which use `.pill-active`, `CategoryTabs.tsx:33`) are subtly inconsistent.
**Why it matters:** Brand-gradient changes won't propagate; storefront vs admin pills already diverge from the documented token. Directly contradicts the "reuse global classes, don't invent parallel styles" rule.
**Fix:** Reuse `.pill-active`/`.pill-inactive` (or add a `.pill-admin-active` variant in `globals.css`) for the admin controls, nav, and checkout toggle.

#### I13 (Code Quality) — `createPublicClient()` byte-for-byte duplicated in two query modules
**Location:** `lib/queries/site.ts:18-23` + `lib/queries/menu.ts:13-18`
**What is wrong:** The cookieless anon-client factory `createPublicClient()` (`createAnonClient(NEXT_PUBLIC_SUPABASE_URL!, NEXT_PUBLIC_SUPABASE_ANON_KEY!)`) is defined identically in both query files; no shared module exists.
**Why it matters:** A change (auth options, alternate key) must be made twice. Maintainability only.
**Fix:** Move the helper to a shared module (e.g. `lib/supabase/public.ts`) and import it in both.

#### I14 (Code Quality) — Product row→`Product` mapping duplicated between public and admin queries
**Location:** `app/(admin)/admin/_lib/queries.ts:38-66` + `lib/queries/menu.ts:42-66`
**What is wrong:** `pickCategory()`, a near-identical `ProductRow`/`AdminProductRow` interface, and the snake→camel `mapProductRow`/`mapProduct` are duplicated; the admin versions differ only by adding `category_id`/`categoryId`, and the admin `PRODUCT_SELECT` is a superset of the inline public select.
**Why it matters:** A schema/field change must be mirrored in both interfaces, mappers, and select strings with no compiler signal — the public mapper could silently omit a new column. Maintainability only.
**Fix:** Share `pickCategory` and a base `mapProductRow(row): Product` (admin layering on `categoryId`), and derive the public column list from the admin one.

#### I15 (Code Quality) — Two separate delivery-type label maps (`DELIVERY_LABEL` vs `deliveryLabel`)
**Location:** `lib/whatsapp.ts:65-68` + `app/(admin)/admin/_lib/status.ts:39-41` (and a third copy at `CheckoutForm.tsx:174`)
**What is wrong:** `DELIVERY_LABEL: Record<DeliveryType, string>` and `deliveryLabel(type)` both map the same `DeliveryType` to the same Spanish copy ("Domicilio"/"Recoger en tienda"); `CheckoutForm` hardcodes a third copy.
**Why it matters:** A wording change could be updated in one and missed in another. Maintainability only.
**Fix:** Keep a single `DELIVERY_LABELS` map (or `deliveryLabel()`) in a shared domain module and import it everywhere.

#### I16 (Code Quality) — Repeated component/helper duplication across the codebase
This consolidates the remaining DRY observations (all info-level, no functional impact):
- **Inline `CupIconMini`/`FlavorsIcon` SVGs duplicate the shared `CupIcon`** — `components/sections/Hero.tsx:12-32`, `Nosotros.tsx:33-52` vs `components/icons/CupIcon.tsx:19-27`. Replace with `<CupIcon className=.../>` or add a variant to `components/icons/`.
- **`WhatsAppHandoff` declares a `whatsappNumber` prop that is never passed; fallback uses the placeholder number** — `components/order/WhatsAppHandoff.tsx:23-25` (caller `app/(site)/order/[id]/page.tsx:99-102` never passes it and doesn't fetch `getShopSettings()`). Either fetch and pass `settings.whatsappNumber` (consistent with Navbar/InfoRow) or drop the unused prop; note `buildWhatsAppLink` also needs the number threaded for full settings-awareness. *(Low-leaning, but grouped here as it is a quality/consistency item.)*
- **`Field` component duplicated** between `CheckoutForm.tsx:418-442` and `ProductForm.tsx:460-480`. Extract a single shared `<Field>` (and reuse the `text-xs text-[#f3a9c1]` error class).
- **`run()` `useTransition`+error wrapper duplicated** in `CategoriesManager.tsx:40-51` and `AdminsManager.tsx:33-50` (pattern also inlined in `OrderStatusControl`/`ProductRowActions`/`BrandingManager`). Provide a shared `useActionRunner()` hook.
- **`formatDate` + module-scoped `DATE_FORMAT` reimplemented** in `orders/page.tsx:30-43`, `(shell)/page.tsx:13-24`, `orders/[id]/page.tsx:14-24`. Add a shared `safeFormatDate(formatter, iso)` (or `formatOrderDate(iso, style)`) in `lib/format.ts`.
- **Admin shell layout validates the JWT twice** — `app/(admin)/admin/(shell)/layout.tsx:25-39` calls `getUser()` then `requireAdmin()` (which calls `getUser()` again); `/admin/admins` does it three times. Have `requireAdmin`/`requireSuperAdmin` optionally accept an already-fetched user, or return both the validated user and the decision.
- **Per-route OG/Twitter metadata blocks duplicated** across `menu`/`contacto`/`ubicacion`/`nosotros` (`contacto/page.tsx:31-59` et al.). Add a `pageMetadata({ title, description, path })` helper in `lib/seo.ts`.
- **"Purple link with ArrowRight" CTA style hardcoded repeatedly** — `contacto/page.tsx:163,189,215,240` and `InfoRow.tsx:11-12` (`text-[#B84DFF] hover:text-[#DEB7FF]`, ungoverned hex outside the theme tokens). Promote a `.link-accent` class (or `<AccentLink>`).
- **`changePassword` re-validates password length inline** (`lib/actions/auth.ts:34-39`) instead of reusing `passwordSchema` (`schemas.ts:188-190`) as `resetAdminPassword` does. Call `passwordSchema.safeParse(newPassword)` so the schema is the single source of truth.

---

## Coverage

**Reviewed:** the full data-flow surface — Zod validation schemas (`lib/validation/schemas.ts`), Server Actions (`lib/actions/*`: orders, products, categories, auth, admins, site), Server-Component queries (`lib/queries/*`), the three Supabase clients and the auth helpers (`lib/auth.ts`, `lib/supabase/*`), all SQL migrations including RLS, grants, and the `create_order`/`gen_order_short_code` functions (`supabase/migrations/0001`–`0011`), the cart context/reducer/persistence (`components/cart/*`), checkout and order-confirmation flow (`components/checkout/*`, `components/order/*`, `lib/whatsapp.ts`), the admin shell/login/dashboard/orders/products/categories/admins/branding/settings UI, storefront sections and SEO (`app/sitemap.ts`, `app/robots.ts`, `components/seo/*`, `lib/seo.ts`), the money primitive (`lib/format.ts`), config (`next.config.ts`, `proxy.ts`, `config.toml`), and styling conventions.

**Notably solid / clean:**
- **Order price integrity holds.** `createOrder` and the SECURITY DEFINER `create_order` RPC re-fetch prices and recompute `unit_price`/`line_total`/`total` server-side; only `{productId, qty}` is sent to the RPC; client-sent prices are never trusted (confirmed across `lib/actions/orders.ts` and `0010_remove_promos.sql`). Even the qty-overflow path (L4) aborts transactionally with no persisted corruption.
- **Auth model is correct and consistent.** Authorization uses JWT-validating `getUser()` everywhere (never `getSession()`); the admin role rides in `app_metadata` (service-role-writable only); super-admin is gated by `SUPER_ADMIN_EMAIL`; the service-role client is used only behind `requireSuperAdmin()`; the edge guard (`proxy.ts`/`middleware.ts`) and `lib/auth.ts` stay in sync; `requireAdmin` fails closed with no email-allowlist fallback.
- **RLS denies by default.** No permissive anon SELECT on `orders`/`order_items`, no anon UPDATE/DELETE policy anywhere, admin writes scoped `to authenticated` + `is_admin()`, and a second auto-expose safeguard. The blanket grants (L2) are inert against this.
- **Demo-vs-DB mode discipline is largely respected** — data paths branch on `hasSupabaseEnv()` and the seed fallback keeps `/` and `/menu` statically building (the two `site.ts`/`auth.ts` ordering bugs in L9 are the exception).
- **Money rendering** consistently goes through `formatCop()` on integer COP values; the `CartDrawer` correctly implements modal focus-trap/`inert` (the pattern `ProductDetailModal` should adopt).
- **No critical/high issues, no SQL injection, no secret leakage, and no auth-bypass or privilege-escalation paths were found.**

**Method note:** Findings were confirmed by reading the actual code at `file:line`; each is grounded with exact references. The dominant remediation themes are (1) add `.max()`/structural bounds to public inputs, (2) ship baseline HTTP security headers + escape the JSON-LD sink, and (3) extract the recurring duplicated UI primitives into the shared component/class system the project already favors.