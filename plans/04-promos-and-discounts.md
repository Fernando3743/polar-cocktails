# Plan 04 — Promo codes & discounts

> Status: Not started · Effort: L · Depends on: 01-supabase-and-go-live-config

## Goal
Let customers enter a promo code at checkout and see a discount line + reduced total. The discount is validated and recomputed server-side (the client-sent discount is never trusted), and the applied `promo_code` + `discount_total` are persisted on the order. A new admin promos manager (CRUD) lets the shop create/toggle codes. DB mode keeps order creation atomic via the `create_order` RPC; demo mode validates against a `SEED_PROMOS` list so the static build of `/` and `/menu` and the checkout demo keep working.

## Scope & non-goals
In scope (per the locked launch decisions, item 3 "promos/discounts"):
- A `promos` table + RLS where the admin manages codes and the public cannot freely read the table.
- A SECURITY DEFINER `validate_promo(code, subtotal)` RPC so anon can validate a code without table read access.
- Folding the same validation into `create_order` so the discount is recomputed and persisted atomically (order integrity).
- Two discount types: `percent` (value = whole-number percent) and `fixed` (value = COP off). Optional `min_subtotal`, `active`, `starts_at`/`ends_at`, `max_redemptions`/`times_redeemed`.
- Checkout UI: code input + "Aplicar" button, a discount line + new total in the summary, Spanish error copy.
- Order confirmation + admin order detail show the applied promo + discount.
- Admin promos manager route + actions + nav link.

Non-goals (do NOT build): online payment gateway (payment is still WhatsApp + pay on delivery), stacking multiple codes per order, per-customer redemption limits, age gate, automated alerts. Promo codes do not change the WhatsApp message contract beyond reflecting the discounted total/code (decision item 1: the WhatsApp message remains the shop notification).

## Current state
Confirmed by reading the code:
- `supabase/migrations/0001_init.sql`: enables only `pgcrypto` (line 8 — **`citext` is NOT enabled**, 0004 must add it). `orders` has `total_cop integer not null default 0 check (total_cop >= 0)` (line 109); `order_items.line_total_cop` is `generated always as (qty * unit_price_cop) stored` (line 140). `set_updated_at()` trigger function is defined at line 36 (reuse it for `promos`). Seeds 4 categories + 6 products at 18000 COP each.
- `supabase/migrations/0002_rls.sql`: RLS enabled on all four tables; anon may INSERT orders/order_items but cannot SELECT them; admin (`authenticated`) has full access. `create_order(payload jsonb)` is `security definer set search_path = public` (lines 114-188): it inserts the order shell, loops `payload->'items'`, looks up active product prices, inserts `order_items`, accumulates `v_total`, then `update orders set total_cop = v_total`. `grant execute ... to anon, authenticated` (line 190).
- `lib/actions/orders.ts`: `createOrder` parses with `orderSchema`, then branches on `hasSupabaseEnv()`. Demo path (lines 36-51) prices each item against `SEED_PRODUCTS` and returns `randomUUID()` without persisting. DB path (lines 53-77) calls `supabase.rpc("create_order", { payload: {...} })`. Current type import (line 9) is `import type { OrderInput, OrderStatus } from "@/lib/types"`. `updateOrderStatus` is `getUser()`-guarded.
- `lib/queries/orders.ts`: `OrderRow` (lines 5-15) and the `.select(...)` strings (the one in `getOrders` at line 65 and the one in `getOrderById` at line 95) list `id, customer_name, customer_phone, address, delivery_type, notes, status, total_cop, created_at` — no promo fields. `mapOrderRow` (lines 26-38) maps to `Order`.
- `lib/types.ts`: `OrderInput` (lines 40-47) and `Order` (lines 49-60) have no promo fields. `OrderItem` (lines 62-69).
- `lib/validation/schemas.ts`: `orderSchema` (lines 8-28) with `.refine` for delivery address; `categorySchema` (lines 50-57) is the pattern to mirror for a promo schema.
- `lib/format.ts`: `formatCop` (lines 11-13) and `slugify` (lines 20-28).
- `components/checkout/CheckoutForm.tsx`: client component; `useCart()` exposes `subtotalCop` (confirmed `components/cart/CartProvider.tsx:159`). Already imports `formatCop` (line 10). Order summary subtotal block is at lines 302-307. Submit builds `OrderInput` and calls `createOrder(parsed.data)` (lines 42-86).
- `app/order/[id]/page.tsx`: server component, `force-dynamic`; receives only `{ id }` from params (line 17) and renders a static confirmation — it does NOT load the order. Uses `Container` from `@/components/ui/Container` (exists). The WhatsApp message is built inline at line 19.
- `app/(admin)/admin/(shell)/orders/[id]/page.tsx`: loads via `getOrderById`; computes `itemsTotal` (line 35) and shows a warning when `itemsTotal !== order.totalCop` (lines 97-102) — this must account for the discount once added.
- `app/(admin)/admin/(shell)/orders/page.tsx`: lists orders, shows `formatCop(order.totalCop)` per row (line 83).
- `app/(admin)/admin/_components/AdminNav.tsx`: `LINKS` array (lines 9-14) drives the sidebar; `isActive` (lines 16-19) highlights via `startsWith`.
- `app/(admin)/admin/_lib/queries.ts`: pattern for admin read queries with seed fallback (`getAdminCategories`, lines 118-137).
- `app/(admin)/admin/(shell)/categories/page.tsx` + `app/(admin)/admin/_components/CategoriesManager.tsx` + `lib/actions/categories.ts`: the exact CRUD pattern to mirror — `requireAdmin()` guard with the `SupabaseLike`/`AdminGuard` pattern (categories.ts lines 12-32), `toRow` (34-41), `revalidatePath`, and a client manager with create/edit/delete rows + read-only demo mode (it reuses a module-level `inputClass`, `.glass-card`, `.btn-brand`, and a gold demo banner).
- `lib/seed-data.ts`: `SEED_CATEGORIES` + `SEED_PRODUCTS`; currently imports only types from `@/lib/types`. This is where `SEED_PROMOS` + `validateSeedPromo` will live.
- `components/icons/index.ts`: exactly 14 exports; no ticket/tag icon exists — a new inline SVG icon must be added (no emojis).
- `lib/config.ts`: `whatsappUrl(text)` builds the wa.me link.
- `lib/supabase/env.ts`: `hasSupabaseEnv()` is `Boolean(NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY)` — every new data path must branch on it.

## Approach

### 1. Database migration `0004_promos.sql`
Create `supabase/migrations/0004_promos.sql`. See "Database changes" below for the full SQL. It: enables `citext`, creates the `promos` table + enum + RLS, creates `validate_promo(p_code text, p_subtotal int)`, and replaces `create_order` to accept an optional `promoCode` and to persist `promo_code` + `discount_total`, atomically incrementing `times_redeemed`. Because `01-supabase-and-go-live-config` may have already applied `0002` to the live DB, `0004` re-issues `create_order` with `create or replace` (same `create_order(payload jsonb)` signature — the code is carried inside the JSON payload, so no overloaded signature is introduced).

### 2. Types — `lib/types.ts`
Add a promo discount type, extend `OrderInput` and `Order`, and add an admin promo shape used by the manager.

```ts
export type PromoType = "percent" | "fixed";

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  address?: string;
  deliveryType: DeliveryType;
  notes?: string;
  promoCode?: string;            // the code the customer applied (re-validated server-side)
  items: { productId: string; qty: number }[];
}

export interface Order {
  // ...existing fields...
  promoCode: string | null;
  discountCop: number;           // maps to orders.discount_total (DB default 0)
  totalCop: number;              // subtotal - discount, clamped >= 0
  // ...
}

// Result of validating a code (shared by RPC + demo path + checkout UI).
export interface PromoValidation {
  valid: boolean;
  type: PromoType | null;
  value: number | null;
  discountCop: number;           // computed discount for the given subtotal
  reason: string | null;         // Spanish error message when invalid
}

// Admin manager shape.
export interface AdminPromo {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  minSubtotalCop: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
}
```
Note `Order.discountCop` is a non-nullable number (DB column defaults to 0), and `promoCode` is nullable.

### 3. Validation schemas — `lib/validation/schemas.ts`
Add a `promoCode` field to `orderSchema` (optional, normalized) and a `promoSchema` mirroring `categorySchema` for the admin CRUD.

```ts
export const orderSchema = z.object({
  // ...existing fields...
  promoCode: z.string().trim().toUpperCase().max(40).optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  items: z.array(orderItemSchema).min(1, "Tu carrito está vacío."),
}).refine(/* existing delivery-address refine, unchanged */);

export const promoSchema = z.object({
  code: z.string().trim().toUpperCase().min(2, "Ingresa un código.").max(40),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int().positive("El valor debe ser mayor a cero."),
  minSubtotalCop: z.number().int().nonnegative().nullable(),
  active: z.boolean(),
  startsAt: z.string().trim().min(1).nullable(),  // ISO or null
  endsAt: z.string().trim().min(1).nullable(),
  maxRedemptions: z.number().int().positive().nullable(),
})
.refine((d) => d.type !== "percent" || d.value <= 100, {
  message: "El porcentaje no puede superar 100.", path: ["value"],
});

export type PromoSchema = z.infer<typeof promoSchema>;
```

### 4. Seed promos — `lib/seed-data.ts`
Add a small `SEED_PROMOS` list and a pure `validateSeedPromo(code, subtotalCop)` helper so the demo path and the checkout `validatePromo` action share one source of truth. Import `formatCop` from `@/lib/format` for the min-subtotal reason string (the file currently imports only types — adding this import is fine; `lib/format.ts` has no server-only deps).

```ts
import { formatCop } from "@/lib/format";
import type { PromoType, PromoValidation } from "@/lib/types";

interface SeedPromo {
  code: string;
  type: PromoType;
  value: number;
  minSubtotalCop: number | null;
  active: boolean;
}

export const SEED_PROMOS: SeedPromo[] = [
  { code: "POLAR10",  type: "percent", value: 10,    minSubtotalCop: null,  active: true },
  { code: "FRIO5000", type: "fixed",   value: 5000,  minSubtotalCop: 30000, active: true },
];

export function validateSeedPromo(code: string, subtotalCop: number): PromoValidation {
  const normalized = code.trim().toUpperCase();
  const promo = SEED_PROMOS.find((p) => p.code === normalized);
  if (!promo || !promo.active) {
    return { valid: false, type: null, value: null, discountCop: 0, reason: "Código no válido." };
  }
  if (promo.minSubtotalCop !== null && subtotalCop < promo.minSubtotalCop) {
    return { valid: false, type: null, value: null, discountCop: 0,
      reason: `Aplica desde ${formatCop(promo.minSubtotalCop)}.` };
  }
  const raw = promo.type === "percent"
    ? Math.floor((subtotalCop * promo.value) / 100)
    : promo.value;
  const discountCop = Math.min(Math.max(raw, 0), subtotalCop); // clamp 0..subtotal
  return { valid: true, type: promo.type, value: promo.value, discountCop, reason: null };
}
```
(The earlier draft referenced a nonexistent `formatCopForReason` — use `formatCop` as above.)

### 5. Server action — `lib/actions/orders.ts`
Add a `validatePromo` action used by the checkout UI, and fold promo validation into `createOrder` for both modes. Always branch on `hasSupabaseEnv()`.

Update the imports at the top: add `validateSeedPromo` to the seed-data import (do NOT import `SEED_PROMOS` here — it is unused and the flat ESLint config flags unused imports), and add `PromoType`/`PromoValidation` to the type import:
```ts
import { SEED_PRODUCTS, validateSeedPromo } from "@/lib/seed-data";
import type { OrderInput, OrderStatus, PromoType, PromoValidation } from "@/lib/types";
```

```ts
// Called by the checkout "Aplicar" button.
export async function validatePromo(
  code: string, subtotalCop: number,
): Promise<PromoValidation> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, type: null, value: null, discountCop: 0, reason: "Ingresa un código." };
  }
  // Demo mode: validate against the seed list.
  if (!hasSupabaseEnv()) {
    return validateSeedPromo(normalized, subtotalCop);
  }
  // DB mode: anon-safe RPC (no table read access needed).
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("validate_promo", {
    p_code: normalized, p_subtotal: subtotalCop,
  });
  if (error || !data) {
    return { valid: false, type: null, value: null, discountCop: 0, reason: "Código no válido." };
  }
  const row = data as { valid: boolean; type: PromoType | null; value: number | null; discount: number; reason: string | null };
  return {
    valid: row.valid, type: row.type, value: row.value,
    discountCop: row.discount ?? 0,
    reason: row.reason, // RPC returns Spanish reasons
  };
}
```

In `createOrder`, after the `orderSchema` parse, re-validate the code server-side in BOTH modes (never trust a client-sent discount — the client only sends `promoCode`, never a discount amount):

```ts
// Demo path (no DB), inside the existing `if (!hasSupabaseEnv())` block,
// after computing `total` (the subtotal) from SEED_PRODUCTS and the existing
// `if (total <= 0) return { ok: false, error: "Tu carrito está vacío." }`:
let discount = 0;
if (data.promoCode) {
  const v = validateSeedPromo(data.promoCode, total);
  if (!v.valid) return { ok: false, error: v.reason ?? "Código no válido." };
  discount = v.discountCop;
}
// finalTotal = Math.max(0, total - discount) is computed for parity but
// nothing is persisted in demo mode; still return a generated id.
return { ok: true, orderId: randomUUID() };
```

```ts
// DB path: pass the code into the RPC; the RPC recomputes the discount and
// persists promo_code + discount_total atomically. Reject invalid codes.
const { data: orderId, error } = await supabase.rpc("create_order", {
  payload: {
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    address: data.address ?? null,
    deliveryType: data.deliveryType,
    notes: data.notes ?? null,
    promoCode: data.promoCode ?? null,   // <-- new
    items: data.items.map((i) => ({ productId: i.productId, qty: i.qty })),
  },
});
if (error || !orderId) {
  // The RPC raises 'invalid_promo' when a code is bad; surface Spanish copy.
  const msg = error?.message?.includes("invalid_promo")
    ? "El código de descuento no es válido."
    : "No pudimos crear tu pedido. Intenta de nuevo.";
  return { ok: false, error: msg };
}
return { ok: true, orderId: orderId as string };
```

### 6. Admin promos action — `lib/actions/promos.ts` (new)
Mirror `lib/actions/categories.ts` exactly: the `SupabaseLike`/`AdminGuard` `requireAdmin()` pattern (categories.ts lines 12-32), a `toRow` mapper, and `createPromo`/`updatePromo`/`deletePromo` validated with `promoSchema`. Revalidate `/admin/promos` only (catalog paths `/` and `/menu` are NOT affected by promos, so do not revalidate them). Code uniqueness is enforced by the DB unique constraint; on a unique-violation return `"Ya existe un código con ese nombre."`.

### 7. Admin promos read query — `app/(admin)/admin/_lib/queries.ts`
Add `getAdminPromos(): Promise<AdminPromo[]>` mirroring `getAdminCategories` (lines 118-137): in demo mode (`!hasSupabaseEnv()`) map `SEED_PROMOS` into `AdminPromo` (synthetic ids, `timesRedeemed: 0`, null date/min/max fields where absent); in DB mode select all columns ordered by `code`. Import `SEED_PROMOS` and the `AdminPromo` type accordingly.

### 8. Admin promos page + manager
- `app/(admin)/admin/(shell)/promos/page.tsx` (new): mirror `categories/page.tsx` — `force-dynamic`, header, the gold demo-mode warning banner shown when `!hasSupabaseEnv()`, and render `<PromosManager initial={...} readOnly={!hasSupabaseEnv()} />`.
- `app/(admin)/admin/_components/PromosManager.tsx` (new): mirror `CategoriesManager.tsx` (list rows with edit/delete, a "Nueva promo" create form, `useTransition`, `router.refresh()`, a module-level `inputClass`). Fields: code, a type select (Porcentaje / Monto fijo), value, min subtotal (optional), active checkbox, optional starts/ends dates, optional max redemptions. Show `timesRedeemed` (read-only) per row. Reuse `inputClass`, `.glass-card`, `.btn-brand`, the gold demo banner pattern, and Spanish copy. No emojis.
- `app/(admin)/admin/_components/AdminNav.tsx`: add `{ href: "/admin/promos", label: "Promos" }` to the `LINKS` array (lines 9-14). `isActive` already handles the highlight via `startsWith`.

### 9. New icon — `components/icons/TicketIcon.tsx` + `index.ts`
Add an inline-SVG ticket/tag icon (no emojis) following the existing icon component shape, and re-export it from `components/icons/index.ts` (append after the 14 existing exports). Use it for the checkout promo field and (optionally) the admin nav/manager.

### 10. Checkout UI — `components/checkout/CheckoutForm.tsx`
Add promo state and a code input + "Aplicar" button in the order summary, plus discount + new-total lines. Import `validatePromo` from `@/lib/actions/orders` and `PromoValidation` from `@/lib/types`. `formatCop` is already imported (line 10).

```tsx
const [promoCode, setPromoCode] = useState("");
const [appliedPromo, setAppliedPromo] = useState<PromoValidation | null>(null);
const [promoError, setPromoError] = useState<string | null>(null);
const [checkingPromo, setCheckingPromo] = useState(false);

const discountCop = appliedPromo?.valid ? appliedPromo.discountCop : 0;
const totalCop = Math.max(0, subtotalCop - discountCop);

async function applyPromo() {
  setPromoError(null);
  setCheckingPromo(true);
  const v = await validatePromo(promoCode, subtotalCop);
  setCheckingPromo(false);
  if (!v.valid) { setAppliedPromo(null); setPromoError(v.reason ?? "Código no válido."); return; }
  setAppliedPromo(v);
}
```
- If the cart subtotal changes after a promo is applied, the displayed discount must not drift (important for percent/min-subtotal codes). Clear `appliedPromo` (and `promoError`) in a `useEffect` keyed on `subtotalCop` so the customer must re-apply, keeping the displayed discount consistent with the current subtotal.
- In the summary (around lines 302-307), render: Subtotal, then a Descuento line (`-{formatCop(discountCop)}`) only when a valid promo is applied, then Total (`{formatCop(totalCop)}`). Show the applied code label + a "Quitar" link that clears `appliedPromo`/`promoCode`.
- In `handleSubmit`, include `promoCode: appliedPromo?.valid ? promoCode.trim().toUpperCase() : undefined` in the `OrderInput`. The action re-validates — the client value is advisory only.
- On success in demo mode, pass the applied code/discount forward to the confirmation page via query string (see step 11); in DB mode the confirmation page loads the persisted values.

### 11. Order confirmation — `app/order/[id]/page.tsx`
This page currently knows only `id`. To show the applied promo/discount without breaking demo mode:
- DB mode: load the order with `getOrderById(id)` (now returns `promoCode`/`discountCop`) and, when `discountCop > 0`, render a small "Descuento aplicado: CODE (-$X)" line and use the discounted `totalCop`.
- Demo mode (no DB, `getOrderById` returns `null`): accept optional `searchParams` (`?code=...&discount=...`) passed by the checkout redirect and render the same line. Treat these as display-only (nothing is persisted in demo mode, so no trust concern). The WhatsApp message (currently line 19) can append the code, e.g. `... Usé el código CODE.` when present.
- Keep the page `force-dynamic` (already is). Reading `searchParams` is allowed and does not affect the static generation of `/` or `/menu`.

### 12. Admin order detail + list
- `app/(admin)/admin/(shell)/orders/[id]/page.tsx`: when `order.discountCop > 0`, render a "Descuento (CODE)" line of `-{formatCop(order.discountCop)}` between the items total and the order Total. Update the discrepancy check (lines 97-102) so the warning compares `itemsTotal - order.discountCop` against `order.totalCop` instead of `itemsTotal` directly. Optionally include the code in `waMessage`.
- `app/(admin)/admin/(shell)/orders/page.tsx`: optional small "promo" tag next to the total when `order.promoCode` is set; no structural change required.

### 13. Order query mapping — `lib/queries/orders.ts`
- Extend `OrderRow` with `promo_code: string | null` and `discount_total: number`.
- Add `promo_code, discount_total` to both `.select(...)` strings (the one in `getOrders`, line 65, and the one in `getOrderById`, line 95).
- In `mapOrderRow` (lines 26-38) set `promoCode: row.promo_code` and `discountCop: row.discount_total`.

## Database changes
New file: `supabase/migrations/0004_promos.sql`. Apply by hand in the Supabase SQL editor AFTER `0001` and `0002` (no CLI). Concrete sketch:

```sql
-- Polar — promo codes / discounts.
-- 0001 enables only pgcrypto, so citext must be enabled here.
create extension if not exists "citext";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'promo_type') then
    create type promo_type as enum ('percent', 'fixed');
  end if;
end$$;

create table if not exists promos (
  id              uuid primary key default gen_random_uuid(),
  code            citext not null unique,
  type            promo_type not null,
  value           integer not null check (value > 0),
  min_subtotal    integer check (min_subtotal is null or min_subtotal >= 0),
  active          boolean not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  times_redeemed  integer not null default 0 check (times_redeemed >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint promos_percent_max check (type <> 'percent' or value <= 100)
);

-- Reuse the set_updated_at() function defined in 0001.
drop trigger if exists promos_set_updated_at on promos;
create trigger promos_set_updated_at
  before update on promos
  for each row execute function set_updated_at();

-- orders: store the applied code + the computed discount (idempotent).
alter table orders add column if not exists promo_code text;
alter table orders add column if not exists discount_total integer not null default 0
  check (discount_total >= 0);

-- RLS: admin manages; public cannot read promos directly.
alter table promos enable row level security;
drop policy if exists promos_admin_all on promos;
create policy promos_admin_all
  on promos for all to authenticated
  using (true) with check (true);
-- (no anon select/insert/update policy: anon validates only via the RPC.)

-- validate_promo: anon-safe (security definer) discount preview.
create or replace function validate_promo(p_code text, p_subtotal integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo  promos%rowtype;
  v_raw    integer;
  v_disc   integer;
begin
  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Ingresa un codigo.');
  end if;
  select * into v_promo from promos where code = p_code::citext;
  if not found or not v_promo.active then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Codigo no valido.');
  end if;
  if v_promo.starts_at is not null and now() < v_promo.starts_at then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Este codigo aun no esta disponible.');
  end if;
  if v_promo.ends_at is not null and now() > v_promo.ends_at then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Este codigo ya expiro.');
  end if;
  if v_promo.max_redemptions is not null
     and v_promo.times_redeemed >= v_promo.max_redemptions then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'Este codigo ya no esta disponible.');
  end if;
  if v_promo.min_subtotal is not null and p_subtotal < v_promo.min_subtotal then
    return jsonb_build_object('valid', false, 'type', null, 'value', null,
      'discount', 0, 'reason', 'No alcanza el minimo para este codigo.');
  end if;
  v_raw := case when v_promo.type = 'percent'
                then floor((p_subtotal * v_promo.value) / 100.0)::int
                else v_promo.value end;
  v_disc := least(greatest(v_raw, 0), p_subtotal);  -- clamp 0..subtotal
  return jsonb_build_object('valid', true, 'type', v_promo.type::text,
    'value', v_promo.value, 'discount', v_disc, 'reason', null);
end;
$$;
grant execute on function validate_promo(text, integer) to anon, authenticated;
-- NOTE: Spanish reason strings here are intentionally ASCII (no accents) to
-- keep the migration ASCII-only. The TS demo path uses accented Spanish; both
-- are acceptable customer copy.

-- create_order: recompute discount + persist promo_code/discount_total,
-- incrementing times_redeemed atomically. Replaces the 0002 definition
-- (same create_order(payload jsonb) signature — no overload).
create or replace function create_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id      uuid;
  v_delivery_type delivery_type;
  v_address       text;
  v_customer_name text;
  v_customer_phone text;
  v_notes         text;
  v_total         integer := 0;
  v_item          jsonb;
  v_product_id    uuid;
  v_qty           integer;
  v_product       record;
  v_code          text;
  v_promo         promos%rowtype;
  v_discount      integer := 0;
  v_raw           integer;
  v_updated       integer;
begin
  v_customer_name  := btrim(coalesce(payload->>'customerName', ''));
  v_customer_phone := btrim(coalesce(payload->>'customerPhone', ''));
  v_address        := nullif(btrim(coalesce(payload->>'address', '')), '');
  v_notes          := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_delivery_type  := (payload->>'deliveryType')::delivery_type;
  v_code           := nullif(btrim(coalesce(payload->>'promoCode', '')), '');

  if char_length(v_customer_name) < 2 then raise exception 'invalid_customer_name'; end if;
  if char_length(v_customer_phone) < 7 then raise exception 'invalid_customer_phone'; end if;
  if v_delivery_type = 'delivery' and v_address is null then
    raise exception 'address_required_for_delivery';
  end if;
  if jsonb_typeof(payload->'items') <> 'array'
     or jsonb_array_length(payload->'items') = 0 then
    raise exception 'empty_items';
  end if;

  insert into orders (customer_name, customer_phone, address, delivery_type,
                      notes, status, total_cop, promo_code, discount_total)
  values (v_customer_name, v_customer_phone, v_address, v_delivery_type,
          v_notes, 'pending', 0, null, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(payload->'items') loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := coalesce((v_item->>'qty')::integer, 0);
    if v_qty <= 0 then raise exception 'invalid_qty'; end if;
    select id, name, price_cop into v_product
      from products where id = v_product_id and is_active = true;
    if not found then raise exception 'product_not_found'; end if;
    insert into order_items (order_id, product_id, product_name, qty, unit_price_cop)
      values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price_cop);
    v_total := v_total + (v_product.price_cop * v_qty);
  end loop;

  -- Promo: recompute server-side; reject invalid codes; redeem atomically.
  if v_code is not null then
    select * into v_promo from promos where code = v_code::citext;
    if not found or not v_promo.active
       or (v_promo.starts_at is not null and now() < v_promo.starts_at)
       or (v_promo.ends_at  is not null and now() > v_promo.ends_at)
       or (v_promo.min_subtotal is not null and v_total < v_promo.min_subtotal) then
      raise exception 'invalid_promo';
    end if;
    v_raw := case when v_promo.type = 'percent'
                  then floor((v_total * v_promo.value) / 100.0)::int
                  else v_promo.value end;
    v_discount := least(greatest(v_raw, 0), v_total);

    -- Atomic redemption guard against max_redemptions.
    update promos
       set times_redeemed = times_redeemed + 1
     where id = v_promo.id
       and (max_redemptions is null or times_redeemed < max_redemptions);
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception 'invalid_promo'; end if;
  end if;

  update orders
     set total_cop = greatest(0, v_total - v_discount),
         promo_code = v_code,
         discount_total = v_discount
   where id = v_order_id;

  return v_order_id;
end;
$$;
grant execute on function create_order(jsonb) to anon, authenticated;
```
RLS notes: `promos` has only an admin `for all` policy; anon never reads/writes the table directly. `validate_promo` and `create_order` are `security definer`, so anon reaches promo data only through them. `total_cop`'s existing `>= 0` check is preserved by the `greatest(0, ...)` clamp.

(Optional) seed a launch code into `0004` to match `SEED_PROMOS`, e.g. `insert into promos (code, type, value, active) values ('POLAR10','percent',10,true) on conflict (code) do nothing;` — confirm with the shop first (open question).

## Demo-mode parity
- `hasSupabaseEnv()` is false in demo/static builds, so every new data path takes the seed branch: `validatePromo` and `createOrder` both call `validateSeedPromo` against `SEED_PROMOS`; nothing is persisted and a `randomUUID()` is still returned.
- `getAdminPromos` returns `SEED_PROMOS` mapped to `AdminPromo`, and `PromosManager` renders `readOnly` with the gold demo banner (same pattern as `CategoriesManager`).
- `/` and `/menu` do not import promo code at all, so their static generation is unchanged. The checkout and order pages remain `force-dynamic`, so reading `searchParams` on the confirmation page does not force `/` or `/menu` to become dynamic.
- The order confirmation page handles `getOrderById` returning `null` in demo mode by falling back to display-only `searchParams`, so the demo checkout flow still ends on a working confirmation screen.

## Affected files
- Create `supabase/migrations/0004_promos.sql`.
- Edit `lib/types.ts` (PromoType, PromoValidation, AdminPromo; extend OrderInput + Order).
- Edit `lib/validation/schemas.ts` (promoCode on orderSchema; new promoSchema).
- Edit `lib/seed-data.ts` (SEED_PROMOS + validateSeedPromo; add formatCop import).
- Edit `lib/actions/orders.ts` (validatePromo action; promo logic in createOrder, both modes; fix imports — add validateSeedPromo + PromoType/PromoValidation, no unused SEED_PROMOS).
- Create `lib/actions/promos.ts` (admin CRUD, mirrors categories.ts).
- Edit `lib/queries/orders.ts` (select + map promo_code/discount_total).
- Edit `app/(admin)/admin/_lib/queries.ts` (getAdminPromos).
- Create `app/(admin)/admin/(shell)/promos/page.tsx`.
- Create `app/(admin)/admin/_components/PromosManager.tsx`.
- Edit `app/(admin)/admin/_components/AdminNav.tsx` (Promos link).
- Edit `components/checkout/CheckoutForm.tsx` (promo input, discount/total lines, clear-on-subtotal-change effect).
- Edit `app/order/[id]/page.tsx` (show applied promo; DB load + demo searchParams).
- Edit `app/(admin)/admin/(shell)/orders/[id]/page.tsx` (discount line; fix discrepancy check).
- Edit `app/(admin)/admin/(shell)/orders/page.tsx` (optional promo tag).
- Create `components/icons/TicketIcon.tsx` + edit `components/icons/index.ts`.

## Verification
Gates:
1. `npx tsc --noEmit` — types compile (new PromoType/PromoValidation/AdminPromo, extended OrderInput/Order, promoSchema).
2. `npm run lint` — flat ESLint config passes. Watch for unused imports: in `lib/actions/orders.ts` only `validateSeedPromo` is used, not `SEED_PROMOS`.
3. `npm run build` — the canonical gate. Confirm `/` and `/menu` still statically generate from seed data with no Supabase env, and the checkout/order/admin routes stay dynamic.

Manual checks (run `npm run dev`), at desktop AND mobile widths against `design/PolarUIPrototype.png`:
- Demo mode (no env): add items, enter `POLAR10` -> "Aplicar" shows a Descuento line and a reduced Total; an invalid code shows the Spanish error; `FRIO5000` below its min subtotal is rejected with the min-subtotal message; confirming the order lands on the confirmation page showing the applied code/discount. Reducing the cart so subtotal drops below a percent/min threshold clears the stale discount (no drift).
- Demo mode admin: `/admin/promos` renders the seed promos read-only with the gold banner; the new "Promos" nav link is present and highlights when active.
- DB mode (env set, after applying `0004_promos.sql`): create a promo in `/admin/promos`; apply it at checkout; confirm the persisted `orders.total_cop` = subtotal - discount and `discount_total`/`promo_code` are stored (the RPC, not the client, computed them); attempt to tamper by sending a fake code -> order is rejected with the Spanish "código de descuento no es válido" copy; a `max_redemptions: 1` code is consumed exactly once (second use rejected). Admin order detail shows the discount line and no false "lines differ from total" warning.
- Confirm the WhatsApp confirmation link still opens with a prefilled message (including the code when present) — payment remains pay-on-delivery, no gateway introduced.
- Confirm demo mode + the static build of `/` and `/menu` still pass with no Supabase env (gate 3).

## Risks & open questions
- `create_order` is replaced (`create or replace`) so it stays the single `create_order(payload jsonb)` signature; the code travels inside the JSON payload — no overload, backward compatible with existing callers that omit `promoCode`.
- If `01-supabase-and-go-live-config` already applied `0002` to the live DB, `0004` must be applied on top; the `add column if not exists` and `create or replace function` statements are idempotent and safe to re-run.
- `citext` is NOT enabled by `0001` (only `pgcrypto`), so `0004` adds `create extension if not exists "citext"`; if the project cannot enable it, fall back to `code text not null` + `unique index on (lower(code))` and compare with `lower(p_code)` in the RPCs.
- Discount is clamped to `0..subtotal` in the RPC, `validate_promo`, and `validateSeedPromo`; total can never go negative (preserves the existing `total_cop >= 0` check).
- `times_redeemed` is incremented inside `create_order` via a conditional `update ... where (max_redemptions is null or times_redeemed < max_redemptions)` guarded by `get diagnostics row_count`, preventing over-redemption under concurrency.
- Open: one code per order (assumed, no stacking); global vs per-customer redemption limit (global only, per scope); whether `min_subtotal` compares pre-discount subtotal (assumed yes); whether to seed real launch codes into `0004` + `SEED_PROMOS` or ship a demo-only code (confirm with the shop).
