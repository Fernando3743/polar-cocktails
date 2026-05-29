# AGENTS.md

Guidance for coding agents working in this repository.

## Project Snapshot

Polar is a Spanish-language storefront, checkout flow, and admin backend for a
granizado / frozen-cocktail shop.

Stack:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase for Postgres and Auth

The design source of truth is `design/PolarUIPrototype.png`. Visual changes
should be checked against that image and verified in a browser, not just by
reading JSX.

<!-- BEGIN:nextjs-agent-rules -->
## This Is Not Older Next.js

This project uses Next.js 16, whose APIs and file conventions differ from many
older examples. Before changing framework-sensitive code, read the relevant
guide in `node_modules/next/dist/docs/`.

Important examples:

- Root request interception uses `proxy.ts`; do not introduce `middleware.ts`
  as the root convention file.
- `cookies()` is async in server code.
- Server Components, Server Actions, route groups, and static generation rules
  should follow the local Next.js 16 docs and the existing code.
<!-- END:nextjs-agent-rules -->

## Working Rules

- Check `git status --short` before editing. The worktree may contain user
  changes; preserve them.
- Keep changes scoped to the request. Do not refactor unrelated files.
- Prefer existing local patterns over new abstractions.
- Use ASCII in new text and code unless the file already needs Spanish copy or
  another non-ASCII character.
- Do not add dependencies without a clear reason. If dependencies change, update
  the appropriate lockfile and mention it.
- Do not commit, push, reset, or discard changes unless the user explicitly asks.

## Commands

Use the scripts already defined in `package.json`:

```bash
npm run dev          # local dev server at http://localhost:3000
npm run build        # production build; main correctness gate
npm run start        # serve the production build
npm run lint         # ESLint flat config
npx tsc --noEmit     # type-check only
```

There is no test framework configured. For code changes, verify with the most
relevant subset of:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

For UI changes, also run the app and inspect the affected route in a browser.
Check desktop and mobile widths when layout or responsive behavior changes.

## Environment And Modes

Supabase is optional at local runtime. The switch is `hasSupabaseEnv()` in
`lib/supabase/env.ts`, which is true only when both of these are present:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Demo mode, when those env vars are absent:

- Storefront data comes from `lib/seed-data.ts`.
- Checkout validates and recomputes totals, then returns a generated order id.
- Orders are not persisted.
- `proxy.ts` lets requests pass through without auth.

DB mode, when Supabase env vars exist:

- Reads hit Supabase.
- `proxy.ts` refreshes sessions and protects `/admin/*`.
- Orders persist through the `create_order` RPC.
- Admin mutations require an authenticated user.

Keep both modes working. The homepage and menu must continue to build and render
from seed data with no Supabase configuration.

See `SETUP.md` for Supabase setup. Migrations live in:

- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_rls.sql`

## Architecture Map

Top-level app structure:

- `app/page.tsx` renders the storefront using `components/sections/*` and
  `components/menu/*`.
- `app/menu/page.tsx` reuses the product grid for the menu page.
- `app/checkout/page.tsx` and `components/checkout/*` handle checkout.
- `app/order/[id]/page.tsx` shows order confirmation.
- `app/(admin)/admin/*` contains login, dashboard, products, categories, and
  orders.
- `components/cart/*` contains the client-side cart context, reducer, drawer,
  and localStorage integration.
- `components/layout/*` contains shared navbar and footer.
- `components/icons/*` contains inline SVG icons and exports from `index.ts`.
- `lib/config.ts` contains shop constants such as WhatsApp, address, maps URL,
  and nav links.
- `lib/types.ts` contains shared domain types.
- `lib/validation/schemas.ts` contains Zod schemas.

Data flow conventions:

- Reads belong in Server Components and `lib/queries/*`.
- Writes belong in Server Actions under `lib/actions/*`.
- Admin writes must re-check `supabase.auth.getUser()` server-side.
- Revalidate affected public and admin paths after catalog or order mutations.
- Do not add API routes for data fetching unless there is a specific reason.

Supabase clients:

- `lib/supabase/client.ts` is for browser/client code.
- `lib/supabase/server.ts` is for RSC and Server Actions.
- `lib/supabase/middleware.ts` contains the session refresh helper called by
  root `proxy.ts`.

Auth rules:

- There is a single admin-user model.
- Use `getUser()` for authorization checks because it validates the JWT.
- Do not use `getSession()` as an authorization boundary.

Order integrity rules:

- Never trust client-supplied prices.
- `createOrder` must re-fetch products, compute line totals, and compute the
  order total server-side.
- Prices are integer COP values. Format display prices with `formatCop()` from
  `lib/format.ts`.

## Styling And UI

Tailwind is CSS-first in v4:

- There is no `tailwind.config.ts`.
- Theme tokens live in the `@theme` block in `app/globals.css`.
- Global component classes also live in `app/globals.css`.

Reuse the existing visual primitives before adding new styling systems:

- `.container-polar`
- `.btn-brand`
- `.btn-ghost`
- `.btn-outline-rect`
- `.glass-card`
- `.pill-active`
- `.pill-inactive`
- `.hero-title`
- `.hero-glow`
- `.eyebrow`
- `.icon-chip`

UI conventions:

- The customer-facing copy is Spanish.
- Do not use emojis. Use existing inline SVG icons from `components/icons/`.
- Product and hero imagery currently use `PlaceholderCup`; real product photos
  should come from `imageUrl` / `image_url` where available.
- Keep components responsive. Verify text does not overlap or overflow on mobile.
- Match the prototype before inventing new visual language.

## Next.js And React Boundaries

- Server Components are the default in `app/*`; add `"use client"` only for
  interactivity, browser APIs, state, effects, or context.
- Cart UI is client-only and mounted through `components/Providers.tsx`.
- Pages that depend on request-time data or auth should stay dynamic as the
  current admin, checkout, and order routes already do.
- Use the `@/*` import alias from `tsconfig.json`.
- Keep metadata and language settings in `app/layout.tsx` aligned with the
  Spanish storefront.

## Verification Checklist

For non-trivial changes, report what was run and any failures:

1. Type-check with `npx tsc --noEmit`.
2. Lint with `npm run lint`.
3. Build with `npm run build` when touching routing, server actions, data
   loading, Supabase, or framework behavior.
4. Browser-check UI changes against `design/PolarUIPrototype.png`.
5. Confirm demo mode still works without Supabase env vars when touching data
   paths.

