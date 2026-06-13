# Plan 03 — Inventory & sold-out control

> Status: Not started · Effort: M · Depends on: 01-supabase-and-go-live-config

## Goal
Add a manual `sold_out` control so unavailable granizado flavors cannot be ordered, with an OPTIONAL tracked `stock_qty` extension documented and wired for later. Sold-out products stay visible on the storefront with an "Agotado" badge and a disabled add-to-cart button; availability is enforced server-side in both `createOrder` branches (demo + DB) and the `create_order` RPC; and the admin gets a sold-out toggle plus an optional stock field. Demo mode and the static build of `/` and `/menu` must keep working.

## Scope & non-goals
In scope (locked decision 3 — inventory/sold-out is launch-blocking):
- New migration `0003_inventory.sql`: `sold_out boolean NOT NULL DEFAULT false` and (optional extension) `stock_qty integer` nullable (null = untracked), plus a `create or replace` of `create_order` to re-check availability atomically.
- Domain type + every mapper updated (`lib/types.ts`, `lib/queries/menu.ts`, `lib/seed-data.ts`, `app/(admin)/admin/_lib/queries.ts`).
- Storefront badge + disabled buttons in `components/menu/ProductCard.tsx`.
- Mandatory server-side enforcement in `lib/actions/orders.ts` (demo + DB) and the RPC.
- Admin toggle + optional stock field in `app/(admin)/admin/_components/ProductForm.tsx`, the products list, `lib/actions/products.ts`, `lib/validation/schemas.ts`, and the edit page's `initial` object.
- A clear Spanish error at checkout when a cart item is sold out.

Non-goals (locked decision 4): no age gate, no business hours / open-closed, no automated shop alerts (the WhatsApp message remains the only shop notification), no delivery zones, no online payment. This plan does NOT add a stock-movement ledger or reservation system — `stock_qty` (when enabled) is a single integer decremented atomically inside `create_order`. RLS stays as-is (product writes are already admin-only via `products_admin_all`); no new policy is added because no new table is introduced and RLS is row-level, not column-level.

Recommendation: ship `sold_out` as the primary, launch-blocking mechanism (most realistic for a shop that runs out of a flavor for the night). Author the `stock_qty` column and RPC hooks so the extension is a flip-the-switch follow-up, and keep the admin stock field clearly optional.

## Current state
Confirmed by reading the code:
- `supabase/migrations/0001_init.sql:70-96` defines `products` (no availability column) and `0001_init.sql:161-173` seeds 6 products. `0002_rls.sql:41-54` gives public read of `is_active = true` and admin-all writes. The `create_order` RPC (`0002_rls.sql:114-190`) selects only `id, name, price_cop` where `is_active = true` (`0002_rls.sql:168-172`), inserts items, and recomputes the total in one transaction.
- `lib/types.ts:8-20` `Product` has no availability field. `CartItem` (`lib/types.ts:22-29`) is built from `Product` in the cart reducer (`components/cart/CartProvider.tsx:49-56`) and carries only price/display data.
- `lib/queries/menu.ts:13-24` `ProductRow`; `mapProductRow` (`menu.ts:33-48`); the DB select string (`menu.ts:83`) filtered by `.eq("is_active", true)` (`menu.ts:85`); demo fallback returns `SEED_PRODUCTS` (`menu.ts:75-77`). Both `/` and `/menu` read through `getProducts()`.
- `lib/seed-data.ts:20-99` lists 6 seed products (all `isActive: true`, no availability flag).
- `lib/actions/orders.ts:36-51` demo branch prices against `SEED_PRODUCTS` filtering `p.isActive` and already returns `"Uno de los productos no está disponible."` when no match (`orders.ts:42-44`); DB branch (`orders.ts:54-77`) delegates to the `create_order` RPC; the catch-all error is at `orders.ts:69-74`.
- `lib/actions/products.ts:48-60` `toRow` maps the form to DB columns; `create`/`update` call `productSchema.safeParse` (`products.ts:71-77, 106-112`); `requireAdmin()` (`products.ts:21-33`) and `revalidateStorefrontAndAdmin()` (`products.ts:62-66`) already cover auth + revalidation of `/`, `/menu`, `/admin/products`.
- `lib/validation/schemas.ts:36-46` `productSchema` (no availability field).
- `components/menu/ProductCard.tsx:13-80` renders the card. Two add-to-cart buttons (mobile `:24-31`, desktop `:69-76`) both call `handleAdd` (`:17-20`). A "Más pedido" badge uses the top-left absolute pattern (`:52-56`) **and is `md:hidden` (mobile-only)**. The file imports `Image`, `PlaceholderCup`, `PlusIcon`, `useCart`, `formatCop`, `Product` — it does **NOT** import `clsx`.
- `app/(admin)/admin/_components/ProductForm.tsx:19-29` the `initial` prop type, `:32-42` `DEFAULTS`, `:93-103` payload assembly, `:222-231` the "Orden" number field, `:244-254` the existing `isActive` checkbox — the patterns to mirror. `FieldKey = keyof ProductSchema` (`:12`), so new schema keys flow into the error map automatically.
- `app/(admin)/admin/(shell)/products/page.tsx:64-79` row markup with an "Inactivo" badge (`:69-73`) — the list badge pattern to reuse.
- `app/(admin)/admin/_lib/queries.ts:19-34` `AdminProductRow`, `:43-59` `mapProduct`, `:61-62` `PRODUCT_SELECT`, seed fallbacks (`:66-72, 88-96`, both spread `...p`).
- `app/(admin)/admin/(shell)/products/[id]/page.tsx:47-61` builds the `initial` object passed to `ProductForm`.
- `components/checkout/CheckoutForm.tsx:42-86` builds `OrderInput` and calls `createOrder`; the existing `formError` rendering (`:200-207`) displays the Spanish message `createOrder` returns. The cart has no live availability feed.

## Approach

### 1. Migration `0003_inventory.sql` (DB schema + RPC)
Create `supabase/migrations/0003_inventory.sql` (applied by hand in the Supabase SQL editor, after 0001 and 0002). Add the column(s) and index idempotently, then `create or replace` the `create_order` RPC to re-check availability atomically. No new RLS policies — `products_public_read` / `products_admin_all` already cover the new columns. Full SQL in **Database changes**.

Key points:
- `sold_out boolean NOT NULL DEFAULT false`.
- `stock_qty integer` nullable (null = untracked) with `check (stock_qty is null or stock_qty >= 0)`.
- The RPC's per-item lookup changes from `select id, name, price_cop` to also select `sold_out, stock_qty` and lock the row `for update` so concurrent orders cannot oversell. It raises `product_sold_out` or `insufficient_stock` to abort the whole transaction, and decrements `stock_qty` only when tracked.

### 2. Domain type — `lib/types.ts`
Add availability to `Product` (after `isActive`, `:19`):
```ts
export interface Product {
  // ...existing fields...
  isActive: boolean;
  soldOut: boolean;
  stockQty?: number | null; // null/undefined = untracked
}
```
`CartItem` does not need the new fields, so the cart reducer (`CartProvider.tsx:49-56`) is unaffected and must not change.

### 3. Mappers — `lib/queries/menu.ts`, `lib/seed-data.ts`, `app/(admin)/admin/_lib/queries.ts`
- `lib/queries/menu.ts`: extend `ProductRow` (`:13-24`) with `sold_out: boolean; stock_qty: number | null;`; add both to the `.select(...)` string (`:83`); set `soldOut: row.sold_out, stockQty: row.stock_qty` in `mapProductRow` (`:33-48`). Keep `.eq("is_active", true)` (`:85`); do NOT add `.eq("sold_out", false)` — sold-out products must still render with a badge.
  ```ts
  // menu.ts select (line 83)
  .select(
    "id, name, slug, description, price_cop, accent_color, image_url, sort_order, is_active, sold_out, stock_qty, category:categories(name, slug)",
  )
  ```
- `lib/seed-data.ts`: add `soldOut: false` to all 6 products (`:20-99`). Leave `stockQty` unset (untracked) so the demo never blocks on stock. Recommendation: keep all `false` so the demo checkout stays green; verify the badge by toggling one product locally.
- `app/(admin)/admin/_lib/queries.ts`: extend `AdminProductRow` (`:19-34`) with `sold_out: boolean; stock_qty: number | null;`; map them in `mapProduct` (`:43-59`) to `soldOut`/`stockQty`; add both columns to `PRODUCT_SELECT` (`:61-62`). The two seed fallbacks (`:66-72, 88-96`) spread `...p`, so they inherit `soldOut` (and `stockQty` if set) from `SEED_PRODUCTS` once steps 2 + 3a land — confirm both carry through.

### 4. Storefront badge + disabled buttons — `components/menu/ProductCard.tsx`
First, **add the missing import** at the top (the file does not currently import `clsx`):
```ts
import { clsx } from "clsx";
```
Add `const soldOut = product.soldOut;` inside the component and short-circuit `handleAdd` (`:17-20`):
```tsx
function handleAdd() {
  if (soldOut) return;
  addItem(product);
  openCart();
}
```
On BOTH buttons (`:24-31` mobile, `:69-76` desktop) add `disabled={soldOut}`, `aria-disabled={soldOut}`, and wrap the existing className string in `clsx(...)` with a disabled modifier:
```tsx
className={clsx(
  /* existing className string verbatim */,
  soldOut && "opacity-40 cursor-not-allowed pointer-events-none",
)}
```
Render an "Agotado" badge using the existing absolute pattern (the "Más pedido" span at `:52-56`), but place it top-right and reuse the neutral `polar-dim` token so it does not clash with the purple "Más pedido". **Do NOT copy `md:hidden`** — the "Más pedido" badge is mobile-only, but "Agotado" must show at all widths:
```tsx
{soldOut && (
  <span className="absolute right-[10px] top-[10px] z-20 inline-flex h-[17px] items-center rounded-full border border-[rgba(126,119,144,0.5)] bg-[rgba(13,12,32,0.9)] px-[9px] text-[8px] font-bold uppercase tracking-wide text-polar-dim md:text-[9px]">
    Agotado
  </span>
)}
```
Note: on the featured card the desktop add button is top-right hidden until `md:`, and the mobile add button is at `right-[10px] top-[9px]`. The "Agotado" badge at `right-[10px] top-[10px]` overlaps that mobile add button — that is acceptable because the add button is disabled and dimmed, but if visual clash is undesired, place the badge at `left-[10px]` on the featured card (where "Más pedido" is mobile-only) or push the badge below the cup. Verify at mobile width during manual checks. Optionally add `soldOut && "opacity-50"` to the image / `PlaceholderCup` wrapper (`:33`) for a clearer dimmed look.
`ProductGrid.tsx` and `CategoryTabs.tsx` need NO change — filtering is by category slug only; verify a sold-out product still appears under its tab.

### 5. Mandatory server-side enforcement — `lib/actions/orders.ts`
Branch on `hasSupabaseEnv()` (already the structure):
- **Demo branch** (`:36-51`): extend the existing match to reject sold-out (and, if a seed ever sets `stockQty`, insufficient stock). Reuse the existing Spanish copy style:
  ```ts
  const product = SEED_PRODUCTS.find(
    (p) => p.id === item.productId && p.isActive,
  );
  if (!product || product.soldOut) {
    return {
      ok: false,
      error: `${product?.name ?? "Un producto"} no está disponible por ahora.`,
    };
  }
  if (product.stockQty != null && product.stockQty < item.qty) {
    return { ok: false, error: `No hay suficiente stock de ${product.name}.` };
  }
  total += product.priceCop * item.qty;
  ```
- **DB branch** (`:54-77`): no other client change is required — the RPC (step 1) enforces availability atomically. But map the RPC's new error tokens to Spanish so the customer sees a useful message instead of the generic fallback. Replace the catch-all at `:69-74`:
  ```ts
  if (error || !orderId) {
    const code = error?.message ?? "";
    if (code.includes("product_sold_out")) {
      return {
        ok: false,
        error: "Uno de los productos ya no está disponible. Actualiza tu carrito.",
      };
    }
    if (code.includes("insufficient_stock")) {
      return {
        ok: false,
        error: "No hay suficiente stock de uno de los productos.",
      };
    }
    return { ok: false, error: "No pudimos crear tu pedido. Intenta de nuevo." };
  }
  ```
  (Supabase surfaces `raise exception 'product_sold_out'` as `error.message` containing that token.)

### 6. Admin — schema, action mapper, form, list, edit page
- `lib/validation/schemas.ts` `productSchema` (`:36-46`): add
  ```ts
  soldOut: z.boolean(),
  stockQty: z.number().int().nonnegative().nullable(), // null = untracked
  ```
- `lib/actions/products.ts` `toRow` (`:48-60`): add `sold_out: input.soldOut,` and `stock_qty: input.stockQty,`. No other change — auth + revalidation already covered.
- `app/(admin)/admin/_components/ProductForm.tsx`:
  - Extend the `initial` prop type (`:19-29`) and `DEFAULTS` (`:32-42`) with `soldOut: false` and `stockQty: null` (DEFAULTS `stockQty` may be `null`).
  - Add state: `const [soldOut, setSoldOut] = useState(initial?.soldOut ?? DEFAULTS.soldOut);` and a string-backed stock input mirroring `priceCop`/`sortOrder` (`:58-60, 72-74`): `const [stockQty, setStockQty] = useState(initial?.stockQty != null ? String(initial.stockQty) : "");`.
  - Add to the `payload` object (`:93-103`): `soldOut,` and `stockQty: stockQty.trim() === "" ? null : Number.parseInt(stockQty, 10),`. Because `FieldKey = keyof ProductSchema` (`:12`), new keys integrate with the error map with no extra wiring.
  - Add a sold-out checkbox mirroring the `isActive` checkbox (`:244-254`), Spanish label "Agotado (no se puede pedir)".
  - Add an optional number field mirroring the "Orden" field (`:222-231`), label "Stock disponible (opcional, vacío = sin control)", with Spanish help text clarifying empty = untracked.
- `app/(admin)/admin/(shell)/products/page.tsx` (`:64-79`): render an "Agotado" badge next to the "Inactivo" badge (`:69-73`) when `product.soldOut`, reusing the exact same pill classes:
  ```tsx
  {product.soldOut && (
    <span className="rounded-full border border-[rgba(126,119,144,0.4)] bg-[rgba(126,119,144,0.12)] px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide text-polar-dim">
      Agotado
    </span>
  )}
  ```
  Optionally append `Stock: N` to the muted subline (`:75-78`) when `product.stockQty != null`.
- `app/(admin)/admin/(shell)/products/[id]/page.tsx` (`:47-61`): the `initial` object must also pass `soldOut: product.soldOut` and `stockQty: product.stockQty ?? null`.

### 7. Checkout cart resilience — `components/checkout/CheckoutForm.tsx`
The authoritative block is server-side (steps 1 + 5), and the existing `formError` rendering (`:200-207`) already displays the Spanish message `createOrder` returns. That satisfies "surface a clear Spanish error" with no structural change.

Optional polish (recommended, low cost, document if taken): the checkout Server Component can pass `getProducts()` to the client form so it can pre-flag sold-out lines, derive `unavailableNames`, and disable "Confirmar pedido" with an inline note. Keep optional to avoid scope creep; otherwise rely on the submit-time error.

## Database changes
New file `supabase/migrations/0003_inventory.sql`:
```sql
-- Polar — inventory & sold-out control.
-- Adds a manual sold_out flag and an OPTIONAL tracked stock_qty (null = untracked),
-- and re-checks both atomically inside create_order.

alter table products
  add column if not exists sold_out boolean not null default false;

alter table products
  add column if not exists stock_qty integer
    check (stock_qty is null or stock_qty >= 0);

create index if not exists products_sold_out_idx on products (sold_out);

-- No new RLS policies: products_public_read / products_admin_all (0002_rls.sql)
-- already cover the new columns. Public read still returns sold-out rows so the
-- storefront can show an "Agotado" badge.

-- Re-check availability inside the order transaction. Rows are locked FOR UPDATE
-- so concurrent orders cannot oversell tracked stock. This is the existing
-- 0002 create_order verbatim plus sold_out/stock_qty handling.
create or replace function create_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id       uuid;
  v_delivery_type  delivery_type;
  v_address        text;
  v_customer_name  text;
  v_customer_phone text;
  v_notes          text;
  v_total          integer := 0;
  v_item           jsonb;
  v_product_id     uuid;
  v_qty            integer;
  v_product        record;
begin
  v_customer_name  := btrim(coalesce(payload->>'customerName', ''));
  v_customer_phone := btrim(coalesce(payload->>'customerPhone', ''));
  v_address        := nullif(btrim(coalesce(payload->>'address', '')), '');
  v_notes          := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_delivery_type  := (payload->>'deliveryType')::delivery_type;

  if char_length(v_customer_name) < 2 then
    raise exception 'invalid_customer_name';
  end if;
  if char_length(v_customer_phone) < 7 then
    raise exception 'invalid_customer_phone';
  end if;
  if v_delivery_type = 'delivery' and v_address is null then
    raise exception 'address_required_for_delivery';
  end if;
  if jsonb_typeof(payload->'items') <> 'array'
     or jsonb_array_length(payload->'items') = 0 then
    raise exception 'empty_items';
  end if;

  insert into orders (customer_name, customer_phone, address, delivery_type, notes, status, total_cop)
  values (v_customer_name, v_customer_phone, v_address, v_delivery_type, v_notes, 'pending', 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := coalesce((v_item->>'qty')::integer, 0);

    if v_qty <= 0 then
      raise exception 'invalid_qty';
    end if;

    -- Lock the row to serialize concurrent stock decrements.
    select id, name, price_cop, sold_out, stock_qty
      into v_product
      from products
     where id = v_product_id
       and is_active = true
     for update;

    if not found then
      raise exception 'product_not_found';
    end if;
    if v_product.sold_out then
      raise exception 'product_sold_out';
    end if;
    if v_product.stock_qty is not null and v_product.stock_qty < v_qty then
      raise exception 'insufficient_stock';
    end if;

    insert into order_items (order_id, product_id, product_name, qty, unit_price_cop)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price_cop);

    -- Decrement only when tracked.
    if v_product.stock_qty is not null then
      update products set stock_qty = stock_qty - v_qty where id = v_product.id;
    end if;

    v_total := v_total + (v_product.price_cop * v_qty);
  end loop;

  update orders set total_cop = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;
```
Because the whole function runs in one transaction, any `raise exception` rolls back the partially-inserted order shell and its items — no order persists when an item is unavailable. Server-side price recompute is preserved; client prices/discounts are never trusted.

## Demo-mode parity
- `hasSupabaseEnv()` stays the switch. With no env, `getProducts()` returns `SEED_PRODUCTS` (now each `soldOut: false`, `stockQty` unset), so `/` and `/menu` still statically generate from seed data with the new field present and type-safe.
- The storefront badge keys off `product.soldOut`; with all seeds `false`, the demo storefront looks unchanged. The "Agotado" path is verifiable by temporarily flipping one seed product locally.
- The `createOrder` demo branch (step 5) gains a `soldOut` guard but, since seeds are all available, the demo checkout still succeeds and returns a generated `orderId` without persisting.
- Admin in demo mode is read-only already (`products/page.tsx:30-34` shows the "Base de datos no configurada" notice); the new form fields render but cannot be saved, consistent with existing behavior.
- Asymmetry to document: demo mode cannot decrement `stockQty` (SEED_PRODUCTS is a constant), so demo gates only on `soldOut`; real stock decrement is DB-only via the RPC.

## Affected files
- `supabase/migrations/0003_inventory.sql` (new) — `sold_out` + optional `stock_qty` columns, index, updated `create_order` RPC.
- `lib/types.ts` — add `soldOut` (+ optional `stockQty`) to `Product`.
- `lib/queries/menu.ts` — extend `ProductRow`, the select string, and `mapProductRow`; do NOT filter sold-out out.
- `lib/seed-data.ts` — add `soldOut: false` to all 6 seed products.
- `app/(admin)/admin/_lib/queries.ts` — extend `AdminProductRow`, `mapProduct`, `PRODUCT_SELECT`.
- `lib/actions/orders.ts` — demo-branch sold-out/stock guard + DB-branch RPC error-code mapping to Spanish.
- `lib/actions/products.ts` — `toRow` writes `sold_out`/`stock_qty`.
- `lib/validation/schemas.ts` — add `soldOut`/`stockQty` to `productSchema`.
- `components/menu/ProductCard.tsx` — add `clsx` import, "Agotado" badge, disabled add buttons.
- `app/(admin)/admin/_components/ProductForm.tsx` — sold-out toggle + optional stock field; extend `initial`/`DEFAULTS`/payload/state.
- `app/(admin)/admin/(shell)/products/page.tsx` — "Agotado" list badge (+ optional stock line).
- `app/(admin)/admin/(shell)/products/[id]/page.tsx` — pass `soldOut`/`stockQty` into `ProductForm` `initial`.
- `components/checkout/CheckoutForm.tsx` — no required change (existing `formError` shows the Spanish message); optional pre-flight disable.

## Verification
Gates:
- `npx tsc --noEmit` — confirms the new `Product` fields, the `productSchema` additions, the new mapper fields, and the `clsx` import all type-check.
- `npm run lint` — ESLint flat config clean (watch for the new `clsx` import being actually used).
- `npm run build` — canonical gate; must statically generate `/` and `/menu` from seed data with the new field present (demo-mode parity).

Manual checks (`npm run dev`, compare against `design/PolarUIPrototype.png` at desktop AND mobile widths):
- Demo mode (no env): storefront and menu render unchanged with all seed products available. Temporarily set one seed product `soldOut: true` → the "Agotado" badge shows at BOTH desktop and mobile widths, the product still appears under its category tab, both add buttons are disabled (mobile top-right and desktop bottom-right), and clicking does nothing. Revert.
- Demo checkout: add an available product, confirm the order succeeds and lands on `/order/[id]`. With a sold-out seed temporarily forced into the cart, confirm `createOrder` returns the Spanish "no está disponible por ahora" message in `formError`.
- DB mode (after applying `0003_inventory.sql` in the Supabase SQL editor): in `/admin`, edit a product, toggle "Agotado" on, save; confirm the storefront shows the badge + disabled button and that submitting an order containing it fails with the Spanish sold-out message and persists NO order row. Toggle off → ordering works again.
- Optional stock extension (if enabled): set `stock_qty` to a small number, place an order exceeding it → "No hay suficiente stock"; place a valid order → stock decrements by the ordered qty (check the `products` row). Place two near-simultaneous orders to sanity-check the `for update` lock prevents oversell.
- Mobile layout: confirm the "Agotado" badge does not collide with the mobile add button / "Más pedido" badge on the featured card; text does not overflow.

Explicitly confirm before sign-off: demo mode works with no Supabase env, and `npm run build` still statically generates `/` and `/menu`.

## Risks & open questions
- RPC concurrency: the `for update` row lock prevents overselling tracked `stock_qty`; verify it is present and that any `raise exception` rolls back the whole order.
- `Product` is shared with the cart; `stockQty` must be optional/nullable so seed rows (no stock) and DB rows type-check. `soldOut` is required (defaulted to false in seed, DEFAULTS, and the column).
- Public read must keep sold-out products visible (badge) — do NOT add `.eq("sold_out", false)` to the menu query.
- `ProductCard.tsx` does not import `clsx`; add the import (or use a template string) before using it in the disabled-button className.
- The "Más pedido" badge is `md:hidden` (mobile-only); the "Agotado" badge must render at all widths — do not copy `md:hidden`.
- The localStorage cart has no live availability; the server block is authoritative and the customer sees the Spanish error on submit. A proactive client warning is optional and requires passing `getProducts()` into the checkout form.
- Demo `stock_qty` cannot decrement a constant array — demo gates only on `soldOut`; real decrement is DB-only via the RPC.
- Open: ship `sold_out` only for launch (recommended), leaving `stock_qty` a documented, ready-to-enable extension? Should `stock_qty = 0` auto-imply sold-out, or stay independent (recommended independent)? Storefront behavior is locked to badge (visible), not hide.
