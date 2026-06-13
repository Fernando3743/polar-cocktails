# Polar — Pre-launch Roadmap

Polar already works end-to-end in **demo mode** (storefront, menu, cart, checkout → order
confirmation, and a full admin). This roadmap takes it the rest of the way: a real
Supabase-backed, Vercel-deployed, launch-ready store. There is **one launch milestone** —
every plan below is launch-blocking ("everything before launch"). Each plan is a
self-contained, executable brief; hand them to an Opus 4.8 subagent one at a time.

## Decisions locked

- **Ordering & payment:** WhatsApp + pay on delivery. On "Confirmar pedido" the order
  persists to Supabase (DB mode) or is recomputed against the seed catalog (demo mode), then a
  **prefilled Spanish WhatsApp message to the shop** opens. **That message is the only shop
  notification** — no email/Telegram/automated alerts. **No online payment gateway.**
- **Hosting:** Vercel (Next.js app) + Supabase Cloud (Postgres + Auth).
- **In scope:** real ordering live · inventory/sold-out · promo codes/discounts · SEO & analytics.
- **Out of scope (do not build):** age gate · customer order tracking · delivery fees/zones ·
  business hours/open-closed · automated shop alerts · online payments.

## Execution order

Derived from each plan's dependencies (topological):

1. **Wave 1 — start immediately, in parallel:** `01` (foundation: Supabase + go-live config)
   and `05` (SEO & analytics — fully independent).
2. **Wave 2 — after `01`, in parallel:** `02` (WhatsApp handoff), `03` (inventory),
   `04` (promos). All three depend only on `01` and are independent of each other.
3. **Wave 3:** `06` (deploy) — after `01`–`05` are done.
4. **Wave 4:** `07` (pre-launch QA gate) — after `06`; this is the go/no-go.

**Migration numbering (important):** only `0001_init.sql` and `0002_rls.sql` exist today, and
they are applied **by hand in the Supabase SQL editor, in numeric order** (no Supabase CLI).
Plans `02`, `03`, `04` each add schema, so they would all reach for `0003` — a collision.
**Resolution at execution time:** claim the next free index in the order you actually execute.
Recommended concrete assignment:

| Plan | Migration | Notes |
| --- | --- | --- |
| `03` inventory | `0003_inventory.sql` | adds `products.sold_out` (+ optional `stock_qty`); updates `create_order` RPC |
| `04` promos | `0004_promos.sql` | adds `promos` table + `orders.promo_code/discount_total`; replaces `create_order` RPC; adds `validate_promo` |
| `02` short code | `0005_order_short_code.sql` | **optional** human-friendly order code; skip if not wanted |

Because `04` and `03` both `create or replace` the `create_order` RPC, apply them in numeric
order and confirm the final RPC contains **both** the sold-out/stock checks and the promo
re-validation before launch (called out in `07`).

## Plans

| # | Plan | Goal (short) | Effort | Depends on | New migration |
| --- | --- | --- | --- | --- | --- |
| 01 | [Supabase & go-live config](./01-supabase-and-go-live-config.md) | Provision Supabase, apply migrations, create admin, fill `lib/config.ts` placeholders, verify DB mode | M | none | none |
| 02 | [WhatsApp order handoff](./02-whatsapp-order-handoff.md) | Persist order, then open a prefilled WhatsApp message to the shop (the order alert) | M | 01 | `0005_order_short_code.sql` *(optional)* |
| 03 | [Inventory & sold-out](./03-inventory-and-sold-out.md) | `sold_out` flag + "Agotado" badge + server-side enforcement + admin toggle | M | 01 | `0003_inventory.sql` |
| 04 | [Promos & discounts](./04-promos-and-discounts.md) | Promo codes validated/recomputed server-side, checkout apply UI + admin manager | L | 01 | `0004_promos.sql` |
| 05 | [SEO, metadata & analytics](./05-seo-and-analytics.md) | Metadata/OG, `sitemap.ts`/`robots.ts`, JSON-LD, Vercel Analytics | M | none | none |
| 06 | [Deployment (Vercel + Supabase)](./06-deployment-vercel.md) | Link repo, env vars, domain, confirm `proxy.ts`/SSG, smoke tests + rollback | M | 01–05 | none |
| 07 | [Pre-launch QA & hardening](./07-pre-launch-qa-and-hardening.md) | RLS/security, a11y, responsive, perf/LCP, content audit, go/no-go DoD | M | 01–06 | none |

## Global definition of done

The launch gate (enforced by `07`):

- **Demo mode still works** and `npm run build` statically prebuilds `/` and `/menu` from seed.
- **DB mode works end-to-end:** menu from Supabase, order persists via `create_order`, admin
  login + products/categories/promos CRUD + order-status updates.
- **Gates green:** `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Deployed** to Vercel against a real Supabase Cloud project on the production domain.
- **No remaining placeholders:** real `WHATSAPP_NUMBER`, `ADDRESS_LINES`, `MAPS_URL`, footer
  social links, `SITE_NAME`, OG image, `NEXT_PUBLIC_SITE_URL`.

## How to execute these plans

- Hand each plan to an **Opus 4.8 subagent — never Haiku.** Each plan is self-contained
  (architecture, exact files, code/SQL sketches, demo-vs-DB branching, verification).
- Work **one plan at a time**, following the wave order above.
- After each plan, run the verification gates (`tsc --noEmit`, `lint`, `build`) and confirm
  **both demo and DB modes** still work before moving on.
- New schema is applied by hand in the Supabase SQL editor in numeric order; every migration
  that changes order math must `create or replace` `create_order` and preserve order integrity
  (server recomputes totals; client-sent prices/discounts are never trusted).

## Open questions for the owner

Resolve these before/at execution (each tagged with the plan that needs it):

1. **Real shop data** — final `WHATSAPP_NUMBER` (country code first), `ADDRESS_LINES`,
   `MAPS_URL`, footer social links, Instagram tiles. *(blocks 01, 02, 07)*
2. **Production domain** — needed for `metadataBase`/sitemap/canonical/OG and the Supabase Auth
   Site URL + redirect URLs; set `NEXT_PUBLIC_SITE_URL`. *(01, 05, 06)*
3. **"Nosotros" nav link** — `#nosotros` is a dead anchor today; add a Nosotros section,
   repoint the link, or remove it. *(01)*
4. **Product image hosting** — keep local `/public/images` (recommended, simplest) or move to a
   Supabase Storage bucket so staff can swap photos without a redeploy. *(01)*
5. **Inventory depth** — manual `sold_out` toggle only (recommended) or also track + decrement
   `stock_qty`. *(03)*
6. **Promo capabilities at launch** — which of percent / fixed / minimum-subtotal / expiry /
   redemption caps the shop actually needs. *(04)*
7. **Analytics tool** — Vercel Analytics (recommended, lowest friction) vs Plausible vs GA4
   (adds a dependency). *(05)*
8. **Package manager** — `package.json` declares `pnpm@10.28.2` but only `package-lock.json`
   exists and docs use npm; reconcile to **npm** before the first Vercel deploy. *(05, 06)*
9. **Preview environment DB** — default Vercel Preview deploys to demo mode, or point them at a
   **separate staging** Supabase project; never at production. *(06)*
10. **Abuse guard** — `create_order` is `security definer` granted to `anon` (callable
    directly, bypassing the Server Action); decide on a rate-limit/guard or accept the risk. *(07)*
