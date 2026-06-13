# Plan 06 — Deployment on Vercel + Supabase Cloud

> Status: Not started · Effort: M · Depends on: 01-supabase-and-go-live-config, 02-whatsapp-order-handoff, 03-inventory-and-sold-out, 04-promos-and-discounts, 05-seo-and-analytics

## Goal
Take the finished Polar app live on Vercel against a Supabase Cloud project. Reconcile the package manager, link the git repo, configure the environment variables for Production and Preview, confirm the Next.js 16 `proxy.ts` interceptor and `force-dynamic`/SSG behavior survive the serverless build, attach a custom domain with HTTPS, keep dev cruft out of the deploy, add a small optional CI gate, and document a post-deploy smoke test and instant-rollback path. This plan is hosting + configuration only — it does not change schema or feature behavior.

## Scope & non-goals
In scope: package-manager reconciliation; Vercel project creation and git linkage; env var setup (Production + Preview) including the safe handling of `SUPABASE_SERVICE_ROLE_KEY`; verifying `proxy.ts` + `updateSession` cookie refresh on Vercel; confirming checkout/order/admin stay dynamic and `/` + `/menu` still prebuild from seed data; image config sanity; custom domain + DNS + HTTPS + canonical site URL coordination with plan 05; `.gitignore`/deploy exclusions; optional CI; smoke-test checklist; rollback note.

Out of scope (locked decisions): age gate, customer order tracking, delivery fees/zones, business hours, automated shop alerts, online payment gateway. Ordering is WhatsApp + pay on delivery (locked decision 1); hosting is Vercel + Supabase Cloud (locked decision 2). Also out of scope here: actual image source compression (a later asset pass — this plan only flags the PNG weight) and the feature behavior of plans 01-05 (this plan assumes they are merged and only verifies they deploy).

## Current state
Confirmed by reading the repo:

- `proxy.ts` (root, Next 16 convention — not `middleware.ts`): exports `async proxy(request)` (line 6) which returns `NextResponse.next()` when `!hasSupabaseEnv()` (lines 8-10) and otherwise delegates to `updateSession(request)` (line 11). Its `config.matcher` (lines 14-25) skips `_next/static`, `_next/image`, `favicon.ico`, and image extensions.
- `lib/supabase/middleware.ts`: `updateSession` builds a `createServerClient` with cookie get/set wired to the request/response, calls `supabase.auth.getUser()` (lines 33-35), and redirects unauthenticated `/admin/*` (except `/admin/login`) to `/admin/login` (lines 41-45).
- `lib/supabase/env.ts`: `hasSupabaseEnv()` is true only when both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. **This is the ONLY thing that toggles demo vs DB mode** — the service-role key and admin email play no part in this gate.
- `next.config.ts`: `images.remotePatterns` already allows `{ protocol: "https", hostname: "**.supabase.co" }`. No `output`, no custom `experimental` flags.
- `package.json`: scripts `dev` (`next dev`), `build` (`next build`), `start` (`next start`), `lint` (`eslint`); deps include `next@16.2.6`, `react@19.2.4`, `@supabase/ssr@^0.10.3`, `@supabase/supabase-js@^2.106.2`, `zod@^4.4.3`. **`"packageManager": "pnpm@10.28.2+sha512..."` is declared (line 30), but the repo tracks `package-lock.json` (npm, 235 KB) and there is NO `pnpm-lock.yaml`.** This mismatch must be reconciled before deploy (see Approach step 1).
- `.env.example`: documents the four vars — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (marked SERVER ONLY), `ADMIN_EMAIL`. **Verified: `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAIL` are NOT read by any code** (`grep` across `lib/` and `app/` finds zero references; they appear only in `.env.example`, `README.md`, and `SETUP.md`). Auth works via `getUser()` against the single admin user you create in Supabase; `ADMIN_EMAIL` only documents *which* user to create (public sign-ups disabled — see `SETUP.md` lines 31-32). The service-role key is documented for forward-compat/privileged server ops but is currently unused. Implication: only the two `NEXT_PUBLIC_SUPABASE_*` vars are strictly required for DB mode; the other two are operator/setup metadata. Set all four anyway for correctness and future use, but do not claim the app reads them.
- `.gitignore`: ignores `/.next/`, `/out/`, `/tmp/`, `.playwright-mcp/`, `.vercel`, `.env`/`.env.*` (keeps `!.env.example`). **Verified per-path with `git check-ignore`:** `out/`, `tmp/`, `.playwright-mcp/`, `.vercel`, and `.next/` ARE ignored; **`template/` is NOT ignored.** `git status --short` shows `template/` untracked and `.claude/scheduled_tasks.lock` deleted.
- Dynamic routes: `app/checkout/page.tsx` (line 4) and `app/order/[id]/page.tsx` (line 6) export `dynamic = "force-dynamic"`. Every admin `(shell)` route also exports it individually: `(shell)/layout.tsx` (line 6), `(shell)/page.tsx` (line 10, dashboard), `(shell)/products/page.tsx` (line 8), `(shell)/products/[id]/page.tsx` (line 6), `(shell)/categories/page.tsx` (line 5), `(shell)/orders/page.tsx` (line 10), `(shell)/orders/[id]/page.tsx` (line 11). The admin shell layout re-checks `getUser()` (lines 23-30) as defense in depth and redirects to `/admin/login` when no env or no user.
- `lib/config.ts`: holds `WHATSAPP_NUMBER` (placeholder `573000000000`), `ADDRESS_LINES` (Tuluá), `MAPS_URL`, `SITE_NAME = "Polar"`, `NAV_LINKS`, and `whatsappUrl(text)`. **There is no site/canonical URL constant or `metadataBase` here yet** — that is the coordination point with plan 05.
- Imagery already uses `next/image`: `components/sections/Hero.tsx` static-imports `@/public/images/polarheroimage.png` (desktop, line 6) and `@/public/generated/polar-mobile-hero.png` (mobile, line 7) and renders both via `<Image>` (lines 71-72 and 153-154). `components/menu/ProductCard.tsx`, `components/layout/Footer.tsx`, and `components/icons/PolarLogo.tsx` also use `next/image`. Raw `<img>` remains only in `components/checkout/CheckoutForm.tsx`, `components/cart/CartDrawer.tsx`, and the admin product form/list (small thumbnails — acceptable). `components/icons/PlaceholderCup.tsx` is an inline `<svg>` gradient cup fallback.
- `public/images/`: the `*-trimmed.png` product art wired into `lib/seed-data.ts` (lines 28-93) is **1.0-1.6 MB each**; `polarheroimage.png` is 2.1 MB; the non-trimmed originals (1.5-1.9 MB) are also tracked. `public/generated/polar-mobile-hero.png` (the mobile LCP) is **2.2 MB** and `public/generated/polar-mobile-concept.png` is 1.76 MB — both git-tracked and not ignored, so the build is safe. Instagram tiles, the logo, and the small info icons are <20 KB.
- Docs: `README.md` and `SETUP.md` exist; **neither has any Vercel/Deploy section yet** (`grep -i vercel/deploy` finds nothing), so step 10 adds genuinely new operator docs.

## Approach

### Step 1 — Reconcile the package manager (pre-flight, do first)
Vercel auto-detects the package manager from the lockfile and the `packageManager` field. The repo has an npm `package-lock.json` (tracked) but declares `pnpm@10.28.2` with no `pnpm-lock.yaml`. This is contradictory and can make Vercel install with the wrong manager or fail. Pick one:

- **Recommended: npm.** Remove the `packageManager` line from `package.json` so Vercel uses npm + `package-lock.json` (matches the documented commands in README/SETUP/AGENTS, which all say `npm run ...`).

```jsonc
// package.json — delete this line (line 30):
"packageManager": "pnpm@10.28.2+sha512..."
```

- Alternative: keep pnpm by committing a real `pnpm-lock.yaml` and removing `package-lock.json`. Only do this if the team standardizes on pnpm — and then also update README/SETUP/AGENTS command examples. Not recommended for launch.

Do not otherwise change install behavior in CI/Vercel; the goal is a single, consistent manager so `next build` runs cleanly.

### Step 2 — Create the Vercel project linked to the repo
1. In Vercel, **Add New Project** → import the git repo.
2. **Framework Preset: Next.js** (auto-detected). Leave Build Command (`next build`), Output (`.next`), and Install Command at defaults — no override needed.
3. **Node version:** pin a version compatible with Next 16 (Node 20 LTS or 22) in Project Settings → General → Node.js Version so it does not float.
4. Do NOT deploy yet — set env vars (step 3) first so the first build runs in the intended mode.
5. No `vercel.json` is required: there are no custom routes, headers, redirects, or function regions to declare. The `proxy.ts` matcher and `force-dynamic` exports cover routing. **Decision: skip `vercel.json`.** (Only add one later if plan 05 needs custom headers/redirects or a specific function region near Colombia.)

### Step 3 — Environment variables (Production + Preview)
Set the env vars in Project Settings → Environment Variables.

| Var | Read by app code? | Scope | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** — half of `hasSupabaseEnv()` | Production (Preview: see below) | Public; Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** — half of `hasSupabaseEnv()` | Production (Preview: see below) | Public; anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** (no current code reads it) | Production (and Preview only if Preview uses a DB) | **SERVER ONLY — never add the `NEXT_PUBLIC_` prefix.** A leaked service-role key is full DB access. Set for forward-compat/privileged ops; the app does not consume it today. |
| `ADMIN_EMAIL` | **No** (operator/setup metadata only) | Production (and Preview only if Preview uses a DB) | Documents *which* single user to create in Supabase (sign-ups disabled). Auth itself is `getUser()` against that user. |

Because the app keys entirely off `hasSupabaseEnv()` (both `NEXT_PUBLIC_SUPABASE_*` present), the env scope choice for those two vars directly selects demo vs DB mode per environment:

- **Production:** set the two `NEXT_PUBLIC_SUPABASE_*` (plus the other two for completeness) → DB mode. Orders persist via the `create_order` RPC, `/admin/*` is gated, menu reads from Supabase.
- **Preview (recommended safe default): leave `NEXT_PUBLIC_SUPABASE_*` UNSET for Preview** → previews run in demo mode (seed data, non-persisted checkout, admin disabled). This guarantees PR previews never touch live orders or the live catalog.
- **Preview alternative:** point Preview at a **separate staging Supabase project** (its own URL/anon/service-role/admin). Only do this if a staging DB exists. Do NOT point Preview at the production project — a logged-in admin on a preview could mutate the live catalog and preview checkouts would write real orders.

Coordinate with plan 01 (it owns Supabase project creation, RLS, disabling public sign-ups, and creating the single admin user matching `ADMIN_EMAIL`). This plan consumes those values; it does not create the DB.

### Step 4 — Add the canonical site URL var (coordinate with plan 05)
Plan 05 (SEO/analytics) needs a `metadataBase` / canonical host. Define one env var, read in both plans:

- Proposed name: **`NEXT_PUBLIC_SITE_URL`** (e.g. `https://<final-domain>`), set for Production (and a `*.vercel.app` value or unset for Preview).
- Surface it in `lib/config.ts` next to `SITE_NAME` so there is one source of truth:

```ts
// lib/config.ts (sketch — add near SITE_NAME on line 13)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
```

Plan 05 then uses `new URL(SITE_URL)` for `metadataBase`. **Confirm the exact var name with plan 05 before implementing** so both plans read the same value (open question). This plan only ensures the var exists in `lib/config.ts` and is set in Vercel to the real domain. The fallback to `http://localhost:3000` keeps local dev and demo builds unaffected.

### Step 5 — Verify proxy.ts + dynamic routes + SSG on Vercel
After the first Production deploy, confirm Next 16 conventions survived the build:

1. **`proxy.ts` runs:** hit `/admin` while logged out on the deployed URL → must redirect to `/admin/login` (proves `proxy(request)` → `updateSession` → `getUser()` ran and the matcher intercepted `/admin`). If it does not redirect, the proxy is not being invoked (check the Vercel build log for the proxy/edge entry and confirm `proxy.ts` is at repo root).
2. **Cookie refresh:** log into `/admin`, navigate between admin pages, leave it a few minutes, then act again → session stays valid (proves `updateSession` rewrites Supabase auth cookies on Vercel's runtime).
3. **Dynamic routes:** check the build output / Vercel function list shows `/checkout`, `/order/[id]`, and the entire `/admin/*` group as dynamic (each exports `dynamic = "force-dynamic"`). They must NOT be prerendered.
4. **SSG preserved:** confirm `/` and `/menu` are statically prerendered from seed data at build time (the build log marks them as static/prerendered). This must hold even with Supabase env present — verify the homepage and menu render and that adding to cart still works.

No code change expected here; this is verification. If `/` or `/menu` unexpectedly become dynamic after plans 03/04 (inventory/promos) land, that is a regression to raise against those plans, not to "fix" by removing `force-dynamic` elsewhere.

### Step 6 — Image config sanity + LCP flag
1. `next.config.ts` already allows `**.supabase.co`, so DB-mode product photos from Supabase Storage optimize through `next/image` on Vercel. No change needed.
2. The hero (desktop + mobile) and product cups already render through `next/image` (confirmed: `Hero.tsx` lines 71-72 / 153-154, `ProductCard.tsx`), so Vercel serves resized/WebP variants automatically. The remaining raw `<img>` tags (cart drawer, checkout form, admin thumbnails) are small and acceptable.
3. **Flag (do not fix here):** the trimmed product PNGs are 1.0-1.6 MB, `public/images/polarheroimage.png` is 2.1 MB, and the **mobile LCP `public/generated/polar-mobile-hero.png` is 2.2 MB** (plus `polar-mobile-concept.png` at 1.76 MB). Even with `next/image` resizing, this source weight inflates the deploy bundle, the first optimization pass, and cold-cache bandwidth. **Recommend compressing/resizing source assets in a later asset-optimization pass.** For launch this is acceptable but should be called out as a known LCP caveat (mobile especially). Optionally drop the unused non-trimmed originals (`*-transparent.png` without `-trimmed`, and `polar-cocktail-product.png`/`polarheronobg.png`) from `public/images/` to shrink the deploy — but only after `grep` confirms nothing references them (`seed-data.ts` references only the `-trimmed` variants).

### Step 7 — Custom domain + DNS + HTTPS
1. In Vercel → Project → Domains, add the production domain (open question: exact domain).
2. Configure DNS at the registrar per Vercel's instructions (apex `A`/`ALIAS` to Vercel, or `CNAME` for a subdomain). Vercel auto-provisions HTTPS (Let's Encrypt) once DNS verifies.
3. Set `NEXT_PUBLIC_SITE_URL` (step 4) to the final `https://` domain for Production and redeploy so `metadataBase`/canonical (plan 05) and any absolute links use the real host, not `*.vercel.app`.
4. Verify `http://` → `https://` and the bare `*.vercel.app` URL behave as expected (Vercel handles the redirect-to-primary-domain config).

### Step 8 — Exclude dev cruft from the deploy
Vercel deploys what git tracks. Confirm exclusions:

1. **`template/`** (untracked, NOT git-ignored — verified — reference-only vanilla HTML/CSS/JS port) must never ship. Add it to `.gitignore` so it cannot be accidentally committed:

```gitignore
# reference-only static port of the storefront — never ship
/template/
```

(Or delete/move it out of the repo — open question. Ignoring is the lowest-risk option.)

2. Already ignored and fine (verified per-path): `/tmp/`, `.playwright-mcp/`, `.vercel`, `/.next/`, `/out/`, `.env`/`.env.*` (with `!.env.example`). No change.
3. `.env.local` must never be committed (covered by `.env.*`). Real secrets live only in Vercel env settings.
4. Leave the `.claude/scheduled_tasks.lock` deletion to the user per AGENTS rules — it is dev tooling state and does not affect the deploy. Do not stage or revert worktree changes.

### Step 9 — Optional CI gate (recommended: a minimal GitHub Action)
Vercel already runs `next build` on every push/PR, which is the canonical correctness gate. To also catch type and lint errors before a deploy attempt, add a small Action. **Recommendation: add it** — it is cheap and runs the same gates the project documents.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run build
        env:
          # Build in demo mode so CI needs no secrets and exercises SSG of / and /menu.
          NEXT_PUBLIC_SUPABASE_URL: ""
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ""
```

Building with the `NEXT_PUBLIC_SUPABASE_*` vars empty makes `hasSupabaseEnv()` false, so CI builds the safe demo/static path with no secrets. (`npm run lint` runs `eslint`; `npm run build` runs `next build`.) If step 1 chose pnpm, swap `npm ci`/`npm run` for the pnpm equivalents and set `cache: pnpm`. If the team prefers fewer moving parts, skip this and rely on Vercel's build check — but the Action gives a green/red signal on PRs without waiting for a preview deploy.

### Step 10 — Update docs
Add a new "Deploy to Vercel" section to `README.md` and/or `SETUP.md` (neither has one today) capturing: the four env vars and their scopes (noting which two actually drive `hasSupabaseEnv()` vs which are setup metadata), the Preview = demo-mode-by-default decision, the `NEXT_PUBLIC_SITE_URL` var, and the rollback note (step 11). Keep it ASCII English; this is operator documentation, not customer copy.

### Step 11 — Post-deploy smoke test + rollback
See Verification for the full checklist. Rollback: Vercel keeps every deployment immutable — if a Production deploy breaks, use **Vercel → Deployments → (previous good deploy) → Promote to Production** (instant rollback, no rebuild). Note this in `SETUP.md`.

## Database changes
None. This plan provisions hosting and configuration only; the Supabase schema/RLS/RPC (including `create_order`) are owned by plans 01-04. No new migration file. Order integrity is unchanged — `createOrder` still re-fetches prices server-side and, in DB mode, delegates to the `create_order` SECURITY DEFINER RPC; client prices/discounts remain untrusted.

## Demo-mode parity
- Production runs in DB mode; demo mode is preserved everywhere env is absent — this plan adds no code branch that bypasses `hasSupabaseEnv()`.
- Preview deploys default to **demo mode** (recommended: `NEXT_PUBLIC_SUPABASE_*` unset for Preview), so PR previews exercise the seed-data path and never persist orders.
- CI builds with empty `NEXT_PUBLIC_SUPABASE_*` → `hasSupabaseEnv()` is false → `npm run build` statically generates `/` and `/menu` from `lib/seed-data.ts`, proving the static build stays green without any secrets.
- The only `lib/config.ts` change (`SITE_URL`) defaults to `http://localhost:3000` when `NEXT_PUBLIC_SITE_URL` is unset, so local dev and demo builds are unaffected; it is config, not a data path.

## Affected files
- `package.json` — reconcile package manager (remove the `packageManager` field on line 30 for the recommended npm path).
- `.gitignore` — add `/template/` (verified it is currently not ignored).
- `lib/config.ts` — add `SITE_URL` constant reading `NEXT_PUBLIC_SITE_URL` near `SITE_NAME` (coordinate naming with plan 05).
- `.github/workflows/ci.yml` — new, optional CI gate (tsc + lint + demo-mode build).
- `README.md` and/or `SETUP.md` — add a new Deploy-to-Vercel + rollback section (none exists today).
- `next.config.ts` — no change required (image `remotePatterns` already correct); listed only because image config was reviewed.
- Vercel dashboard (no repo file): project link, Node version pin, env vars, custom domain/DNS. No `vercel.json`.

## Verification
Gates (run before relying on the deploy):
1. `npx tsc --noEmit` — clean.
2. `npm run lint` — clean.
3. `npm run build` — succeeds; confirm the build output marks `/` and `/menu` as static/prerendered and `/checkout`, `/order/[id]`, and the whole `/admin/*` group as dynamic. Run once with `NEXT_PUBLIC_SUPABASE_*` empty (demo/static path) and once with them set (DB path) to confirm both build.

Manual checks on the deployed Production URL (desktop AND mobile widths, against `design/PolarUIPrototype.png`):
- Storefront `/` loads; hero (desktop + mobile variants) + sections render; layout matches the prototype at desktop and mobile; mobile bottom nav works.
- `/menu` loads; category tabs filter; product cards show photos (DB) or `PlaceholderCup` fallbacks; sold-out/promo states from plans 03/04 render correctly.
- Add to cart → cart drawer/count update; reload preserves cart (`polar_cart` localStorage).
- `/checkout` → "Confirmar pedido": in DB mode the order **persists** (verify a row appears in Supabase / `/admin/orders`), totals are recomputed server-side via the `create_order` RPC, then the prefilled **WhatsApp** message opens (plan 02). The confirmation page `/order/[id]` shows the order id and the "Confirmar por WhatsApp" link works. No online-payment step appears (pay on delivery).
- `/admin` logged out → redirects to `/admin/login` (proves `proxy.ts` + `updateSession` ran on Vercel). Log in as the `ADMIN_EMAIL` user; products/categories CRUD works and revalidates `/` and `/menu`; order status updates work; session persists across navigation (cookie refresh).
- Custom domain serves over HTTPS; canonical/metadata (plan 05) reference the real domain, not `*.vercel.app`.
- Prices everywhere render as integer COP via `formatCop()` (no floats); customer copy is Spanish; no emojis.

Demo + static confirmation: the CI build (empty `NEXT_PUBLIC_SUPABASE_*`) and a Preview deploy (env unset) both succeed and render `/` + `/menu` from seed data with non-persisted checkout — proving demo mode and the static build still pass.

Rollback: confirm a previous deployment can be promoted to Production instantly from the Vercel Deployments list.

## Risks & open questions
- **Package manager mismatch (blocker):** `packageManager: pnpm@10.28.2` vs tracked `package-lock.json` (no `pnpm-lock.yaml`). Reconcile in step 1 before the first deploy or Vercel install may fail / use the wrong manager.
- **Preview env leakage:** scoping the Supabase vars to Preview lets previews write to / mutate the production DB. Default Preview to demo mode, or use a separate staging Supabase project — never production.
- **Service-role key exposure:** `SUPABASE_SERVICE_ROLE_KEY` must stay un-prefixed (no `NEXT_PUBLIC_`) and Production/staging-only. Note no current code reads it (nor `ADMIN_EMAIL`) — they are set for forward-compat/operator setup, not because the running app consumes them; only the two `NEXT_PUBLIC_SUPABASE_*` vars drive behavior.
- **Image LCP:** trimmed product PNGs 1.0-1.6 MB, desktop hero 2.1 MB, mobile-hero LCP 2.2 MB. Acceptable for launch via `next/image`; defer real source compression to a later asset pass; consider dropping unused non-trimmed originals from the deploy.
- **proxy.ts on Vercel:** verify the interceptor actually runs and cookie refresh works on Vercel's runtime, not just locally (smoke test covers this).
- **Canonical URL naming:** confirm `NEXT_PUBLIC_SITE_URL` with plan 05 so `metadataBase`/sitemap/robots and this plan read one source.
- **Open:** final production domain? Preview = demo vs staging DB? Adopt the CI Action or rely on Vercel builds? Ignore vs delete `template/`?
