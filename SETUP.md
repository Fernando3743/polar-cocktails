# Polar — Setup & Handoff

Pixel-perfect landing page + ordering backend + admin for **Polar**, a granizado /
frozen-cocktail shop. Built with **Next.js 16 (App Router) + React 19 + TypeScript +
Tailwind v4 + Supabase**.

The original design lives in `design/PolarUIPrototype.png`.

## Run locally (no database needed)

```bash
npm install
npm run dev          # http://localhost:3000
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
2. Run the SQL migrations (in the Supabase SQL editor, in order):
   - `supabase/migrations/0001_init.sql` — tables, enums, indexes, the `create_order` flow,
     and seeds the 4 categories + 6 products.
   - `supabase/migrations/0002_rls.sql` — row-level security + the `create_order` RPC.
3. In **Supabase → Authentication**: disable public sign-ups, then create one user with the
   `ADMIN_EMAIL` and a password. That user can log in at `/admin`.
4. Restart `npm run dev`. The menu now loads from the database, orders persist, and `/admin`
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
npm run build && npm run start
```
