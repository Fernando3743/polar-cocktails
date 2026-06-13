# Plan 02 — WhatsApp order handoff on confirmation

> Status: Not started · Effort: M · Depends on: 01-supabase-and-go-live-config

## Goal
When a customer presses "Confirmar pedido", persist the order to Supabase (DB mode) or recompute it against the seed catalog (demo mode), then hand the order to the shop as a prefilled **Spanish** WhatsApp message — the single shop notification per locked decision #1. The confirmation page (`app/order/[id]`) shows a prominent `.btn-brand` "Enviar pedido por WhatsApp" button that produces a complete, correct message in **both** modes and survives pop-up blockers.

## Scope & non-goals
**In scope (locked decision #1):** build the WhatsApp message (order ref, each line `nombre x qty = line total`, total, customer name + phone, delivery type, address when delivery, notes) and a `wa.me` link to `WHATSAPP_NUMBER`; wire it so it works whether the order persisted (DB) or not (demo); add a small `lib/whatsapp.ts` formatter and a small client handoff button component; optionally add a human-friendly short order code.

**Out of scope (locked decision #4):** no online payment, no separate automated alerts (email/Telegram), no age gate, no order tracking, no delivery fees/zones, no business-hours logic. The WhatsApp message IS the shop notification; the customer pays cash/transfer on pickup/delivery. **Do not** add API routes for this — reads stay in Server Components / `lib/queries/*`, writes stay in `lib/actions/*`.

## Current state
Confirmed by reading the code:

- **`components/checkout/CheckoutForm.tsx`** (client, `"use client"`). `handleSubmit` (lines 42-86) builds an `OrderInput`, validates with `orderSchema`, calls `createOrder(parsed.data)` (line 74); on `result.ok` it `clear()`s the cart and `router.push('/order/${result.orderId}')` (lines 75-77). State already present: `customerName`, `customerPhone`, `deliveryType`, `address`, `notes` (lines 25-29). The cart comes from `useCart()` (line 23): `items` (each with `name`, `unitPriceCop`, `qty`, `accentColor`, `imageUrl` per `CartItem` in `lib/types.ts`), plus `subtotalCop`, `clear`, `mounted`. Empty-cart card (lines 88-102) and `formError` path (lines 200-207) already exist.
- **`lib/actions/orders.ts`** `createOrder` (lines 24-77). Demo branch (lines 36-51): prices each item from `SEED_PRODUCTS`, computes `total`, returns `{ ok: true, orderId: randomUUID() }` — **nothing is persisted**. DB branch (lines 53-77): calls `supabase.rpc("create_order", { payload })` and returns `{ ok: true, orderId: orderId as string }` (line 76). So in demo mode the confirmation page has no row to fetch.
- **`app/order/[id]/page.tsx`** (Server Component, `dynamic = "force-dynamic"`). Imports `Container` from `@/components/ui/Container`, `SnowflakeIcon, WhatsAppIcon` from `@/components/icons`, and `whatsappUrl` from `@/lib/config`. Today it only knows `id` (line 17), builds a generic one-line `message` (line 19: `Hola Polar, acabo de hacer un pedido. Mi número de pedido es ${id}.`) and links it via `whatsappUrl(message)` inside a static `<a className="btn-brand">` (lines 51-59, button text "Confirmar por WhatsApp"). It does **not** call `getOrderById`. The layout is wrapped in `<Container>` (a glass-card), with the "Número de pedido" card showing `{id}` (lines 41-48).
- **`lib/queries/orders.ts`** `getOrderById(id)` (lines 85-117) returns a full `Order` with `items: OrderItem[]` in DB mode, and `null` in demo mode / not found. The two `.select(...)` column strings are at lines 64-66 (`getOrders`) and 94-96 (`getOrderById`); `mapOrderRow` is lines 26-38. **RLS caveat (important):** `getOrderById` uses the anon server client, and `0002_rls.sql` (lines 56-74) grants **no public SELECT on `orders`** (only `orders_admin_all` for authenticated). So a customer cannot read their own order back — `getOrderById` returns `null` for non-admin callers. Treat `serverSummary` as only opportunistically populated (admin/dev), never as the customer's reliable source.
- **`lib/config.ts`**: `WHATSAPP_NUMBER` (placeholder `573000000000`, real value set by plan 01) and `whatsappUrl(text)` (lines 28-30) `encodeURIComponent`s the text into `https://wa.me/<number>?text=...`. Reuse this — do not build a second URL helper.
- **`lib/types.ts`**: `Order` (lines 49-60, has optional `items?`), `OrderItem` (lines 62-69, fields `productName`, `qty`, `unitPriceCop`, `lineTotalCop`), `OrderInput`, `DeliveryType` (`"delivery" | "pickup"`), `CartItem` (`name`, `unitPriceCop`, `qty`, `accentColor`, `imageUrl`) all defined.
- **`lib/format.ts`**: `formatCop(n)` renders integer COP (`$18.000`). All money in the message must go through it.
- **`supabase/migrations/0001_init.sql`**: `orders.id` is `uuid default gen_random_uuid()` (line 102); `order_items.line_total_cop` is a **GENERATED stored** column = `qty * unit_price_cop` (line 140), so the RPC never assigns it. No human code column exists. **`0002_rls.sql`**: `create_order(payload jsonb)` is `returns uuid`, `security definer` (lines 114-188); returns the order `uuid`.
- There is **no** `lib/whatsapp.ts` and **no** `components/order/` directory yet. `WhatsAppIcon` is exported from `components/icons/index.ts` (line 2).

## Approach

### Step 1 — `lib/whatsapp.ts`: the message formatter (pure, ASCII English code, Spanish output)
Create one module that turns an order-like shape into Spanish text. Define a narrow input type so it works from **both** a persisted `Order` (DB) and an in-memory cart+form (demo) without coupling to either.

```ts
// lib/whatsapp.ts
import { formatCop } from "@/lib/format";
import { whatsappUrl } from "@/lib/config";
import type { DeliveryType } from "@/lib/types";

export interface WhatsAppOrderLine {
  name: string;
  qty: number;
  unitPriceCop: number; // integer COP, server-trusted in DB mode
}

export interface WhatsAppOrderSummary {
  orderRef: string;            // short code if present, else the uuid
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  address?: string | null;     // only meaningful for delivery
  notes?: string | null;
  lines: WhatsAppOrderLine[];
  totalCop: number;            // server-computed total
}

const DELIVERY_LABEL: Record<DeliveryType, string> = {
  delivery: "Domicilio",
  pickup: "Recoger en tienda",
};

// Builds the Spanish WhatsApp body. No emojis; ASCII punctuation only.
export function buildWhatsAppMessage(o: WhatsAppOrderSummary): string {
  const lines: string[] = [];
  lines.push("Hola Polar, quiero confirmar mi pedido.");
  lines.push("");
  lines.push(`Pedido: ${o.orderRef}`);
  lines.push(`Cliente: ${o.customerName}`);
  lines.push(`Telefono: ${o.customerPhone}`);
  lines.push(`Entrega: ${DELIVERY_LABEL[o.deliveryType]}`);
  if (o.deliveryType === "delivery" && o.address) {
    lines.push(`Direccion: ${o.address}`);
  }
  lines.push("");
  lines.push("Productos:");
  for (const l of o.lines) {
    lines.push(`- ${l.name} x ${l.qty} = ${formatCop(l.unitPriceCop * l.qty)}`);
  }
  lines.push("");
  lines.push(`Total: ${formatCop(o.totalCop)}`);
  if (o.notes && o.notes.trim()) {
    lines.push("");
    lines.push(`Notas: ${o.notes.trim()}`);
  }
  lines.push("");
  lines.push("Pago contra entrega (efectivo o transferencia).");
  return lines.join("\n");
}

// Convenience: full wa.me link via the existing config helper.
export function buildWhatsAppLink(o: WhatsAppOrderSummary): string {
  return whatsappUrl(buildWhatsAppMessage(o));
}
```

Notes: customer-facing strings are Spanish; keep the **code** ASCII (plain "Direccion", "Telefono") so the encoded `wa.me` payload stays clean. WhatsApp itself renders the message fine either way; the existing one-liner at `app/order/[id]/page.tsx` line 19 already omits diacritics. `formatCop` keeps the `$18.000` formatting. No emojis.

### Step 2 — Build the summary at confirm time and carry it to the confirmation page (the reliable path in BOTH modes)
**Why this is the primary path:** demo orders are not persisted, and in DB mode RLS blocks the customer from reading their own order (`getOrderById` returns `null` for anon callers — see Current state). So the dependable carrier of the message is a `sessionStorage` payload composed in `CheckoutForm.tsx` right after a successful `createOrder`, **before** `clear()` wipes the cart. Build the summary from the cart `items` (each carrying `name`, `unitPriceCop`, `qty`) and the form fields. The total here is **display-only**; the authoritative total was already recomputed inside `createOrder` (demo branch) / the `create_order` RPC (DB branch).

```tsx
// CheckoutForm.tsx handleSubmit, replace the `if (result.ok)` body (currently lines 75-77)
if (result.ok) {
  const payload = {
    orderId: result.orderId,
    summary: {
      orderRef: result.orderId, // uuid in demo; short code in DB if Step 6 ships
      customerName,
      customerPhone,
      deliveryType,
      address: deliveryType === "delivery" ? address : null,
      notes: notes.trim() ? notes : null,
      lines: items.map((i) => ({
        name: i.name,
        qty: i.qty,
        unitPriceCop: i.unitPriceCop,
      })),
      totalCop: subtotalCop, // display-only mirror of the server total
    },
  };
  try {
    sessionStorage.setItem("polar_last_order", JSON.stringify(payload));
  } catch {
    // private mode / quota: confirmation page falls back to the generic link
  }
  clear();
  router.push(`/order/${result.orderId}`);
}
```

Keep `clear()` **after** the write so a failed write never costs the user their cart. Do **not** auto-`window.open()` here: `await createOrder` breaks the user-gesture chain, so a programmatic open is likely blocked. The confirmation-page button (Step 3) is the dependable path.

### Step 3 — `components/order/WhatsAppHandoff.tsx`: the client button (degrades gracefully)
A small `"use client"` component that decides the message source in priority order and renders the prominent `.btn-brand` as a real anchor (gesture-driven, pop-up-blocker-proof). It reads the demo/DB payload from `sessionStorage` (written in Step 2) and falls back to an optional server-built summary, then to a generic one-liner.

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/icons";
import { whatsappUrl } from "@/lib/config";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import type { WhatsAppOrderSummary } from "@/lib/whatsapp";

const SS_KEY = "polar_last_order"; // sessionStorage key (matches CheckoutForm)

export function WhatsAppHandoff({
  orderId,
  serverSummary,
}: {
  orderId: string;
  serverSummary: WhatsAppOrderSummary | null;
}) {
  // Generic safe fallback so the link is never broken/empty.
  const [href, setHref] = useState<string>(() =>
    serverSummary
      ? buildWhatsAppLink(serverSummary)
      : whatsappUrl(`Hola Polar, quiero confirmar mi pedido. Pedido: ${orderId}.`),
  );

  useEffect(() => {
    // sessionStorage is the reliable carrier (demo + customer-facing DB).
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as { orderId: string; summary: WhatsAppOrderSummary };
      if (stored?.orderId === orderId && stored.summary) {
        setHref(buildWhatsAppLink(stored.summary));
      }
    } catch {
      // ignore; keep generic / serverSummary fallback
    }
  }, [orderId]);

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-brand w-full sm:w-auto"
      >
        <WhatsAppIcon className="h-[18px] w-[18px]" />
        Enviar pedido por WhatsApp
      </a>
      <Link href="/menu" className="btn-ghost w-full sm:w-auto">
        Seguir comprando
      </Link>
    </div>
  );
}
```

Source priority: **(1)** matching `sessionStorage` payload for this `orderId` (the reliable carrier) → **(2)** optional server-built `serverSummary` (populated only when the caller can SELECT the order, i.e. admin/dev) → **(3)** generic one-line fallback so the button is never dead. A real anchor click always opens, so pop-up blockers cannot break it.

### Step 4 — Confirmation page: render the handoff, opportunistically build serverSummary in DB mode
Rewrite **`app/order/[id]/page.tsx`** to keep all existing markup (the `<Container>` glass-card, snowflake `SnowflakeIcon`, "Pedido recibido", "Número de pedido" card showing the ref, "Volver al inicio") and replace the static `<a>`/`message` block with `<WhatsAppHandoff />`. Keep `dynamic = "force-dynamic"`. Only attempt `getOrderById` **inside** the `hasSupabaseEnv()` branch; it will return `null` for ordinary customers (RLS), which is fine — `serverSummary` is just an optional extra source.

```tsx
// app/order/[id]/page.tsx (sketch — keep <Container> and existing copy/markup)
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getOrderById } from "@/lib/queries/orders";
import type { WhatsAppOrderSummary } from "@/lib/whatsapp";
import { WhatsAppHandoff } from "@/components/order/WhatsAppHandoff";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let serverSummary: WhatsAppOrderSummary | null = null;
  if (hasSupabaseEnv()) {
    const order = await getOrderById(id); // null for anon customers (RLS); ok
    if (order && order.items) {
      serverSummary = {
        orderRef: order.shortCode ?? order.id, // shortCode optional, see Step 6
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryType: order.deliveryType,
        address: order.address,
        notes: order.notes,
        lines: order.items.map((it) => ({
          name: it.productName,   // OrderItem.productName
          qty: it.qty,
          unitPriceCop: it.unitPriceCop,
        })),
        totalCop: order.totalCop,
      };
    }
  }

  return (
    // ...existing <Container> + glass-card layout unchanged...
    // The "Número de pedido" card keeps showing {id}.
    // Replace the old <a href={whatsappUrl(message)}>...</a> + sibling <Link>
    // (lines 50-63) with:
    <WhatsAppHandoff orderId={id} serverSummary={serverSummary} />
  );
}
```

`serverSummary` is a plain serializable object, safe to pass to the client component. In demo mode it is `null` and the page relies on `sessionStorage` then the generic fallback.

### Step 5 — Remove the old static link and dead `message`
In `app/order/[id]/page.tsx`: delete `const message = ...` (line 19) and the hardcoded `<a href={whatsappUrl(message)}>...</a>` plus its sibling `<Link href="/menu">` block (lines 50-63), rendering `<WhatsAppHandoff />` in their place. Trim imports: remove `whatsappUrl` and `WhatsAppIcon` from the page (they move into `WhatsAppHandoff`); **keep** `Container` (from `@/components/ui/Container`) and `SnowflakeIcon`, and keep the top-level `Link` import only if still used elsewhere on the page (the "Volver al inicio" link uses it — keep it).

### Step 6 — (Optional, recommended) human-friendly short order code
The shop reads order references aloud over WhatsApp, so a UUID is awkward. Add a short code without blocking launch. **Because RLS blocks the customer from reading the order, the short code must be RETURNED by the `create_order` RPC to reach the customer's message** — surfacing it only via `getOrderById` would make it visible to the admin only. So this single coherent variant applies:

- New migration `supabase/migrations/0003_order_short_code.sql` (see Database changes) adds `orders.short_code text` with a `POL-` + 6 base32 chars generator and a unique index, backfills existing rows, and changes `create_order` to **return the short_code (`text`)** with a collision-safe retry.
- `lib/actions/orders.ts`: the DB branch already does `return { ok: true, orderId: orderId as string }` (line 76); since the RPC now returns `text`, `orderId` is the short code and **no code change is needed** — the route param becomes the short code (a clean human ref; the customer can't SELECT by either key anyway).
- Add `shortCode?: string | null` to `Order` in `lib/types.ts`, and map `short_code` in `lib/queries/orders.ts`: extend `OrderRow` (line 5-15), add `short_code` to both `.select(...)` strings (lines 64-66 and 94-96), and set `shortCode: row.short_code` in `mapOrderRow` (lines 26-38). This lets `/admin/orders` and the opportunistic `serverSummary` show the short code too.
- In demo mode there is no DB, so `orderRef` stays the `randomUUID()` from `createOrder` — acceptable; the demo never reads it back, and the `sessionStorage` summary already carries `orderRef: result.orderId`.

If the owner defers the short code, **skip Step 6 entirely**: Database changes = None, the RPC keeps `returns uuid`, `lib/types.ts`/`lib/queries/orders.ts` are unchanged, and `orderRef` is the uuid everywhere.

## Database changes
**Only if Step 6 is taken (recommended but optional).** New file `supabase/migrations/0003_order_short_code.sql`, applied by hand in the Supabase SQL editor after `0001`/`0002`. This touches only the `orders` table and the order-id return value — it does **not** change order math (`line_total_cop` stays a generated column; per-item pricing and `total_cop` logic from `0002` are unchanged), so order integrity is preserved (server still recomputes; client prices are never trusted).

```sql
-- 0003_order_short_code.sql — human-friendly order reference.

-- Crockford-ish base32 short code generator (ambiguous chars dropped).
create or replace function gen_order_short_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'POL-' || code;
end;
$$;

alter table orders
  add column if not exists short_code text;

-- Backfill existing rows, then enforce default + uniqueness.
update orders set short_code = gen_order_short_code() where short_code is null;
alter table orders alter column short_code set default gen_order_short_code();
create unique index if not exists orders_short_code_key on orders (short_code);

-- RLS: no new policy needed. short_code is just another column on `orders`;
-- existing orders_anon_insert / orders_admin_all (0002_rls.sql) already cover it,
-- and there is still no public SELECT on orders. create_order is SECURITY DEFINER,
-- so it can assign and RETURN the generated code regardless of the caller.

-- Recreate create_order to assign + RETURN the short_code (collision-safe).
-- All validation + pricing logic is identical to 0002_rls.sql; only the return
-- type, the short_code assignment, and the unique-retry loop are added.
create or replace function create_order(payload jsonb)
returns text                       -- was uuid; now returns the short code
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short_code     text;
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
  -- ---- validation (identical to 0002) ----
  v_customer_name  := btrim(coalesce(payload->>'customerName', ''));
  v_customer_phone := btrim(coalesce(payload->>'customerPhone', ''));
  v_address        := nullif(btrim(coalesce(payload->>'address', '')), '');
  v_notes          := nullif(btrim(coalesce(payload->>'notes', '')), '');
  v_delivery_type  := (payload->>'deliveryType')::delivery_type;

  if char_length(v_customer_name) < 2 then raise exception 'invalid_customer_name'; end if;
  if char_length(v_customer_phone) < 7 then raise exception 'invalid_customer_phone'; end if;
  if v_delivery_type = 'delivery' and v_address is null then
    raise exception 'address_required_for_delivery';
  end if;
  if jsonb_typeof(payload->'items') <> 'array'
     or jsonb_array_length(payload->'items') = 0 then
    raise exception 'empty_items';
  end if;

  -- ---- create the order shell with a unique short code (retry on collision) ----
  loop
    v_short_code := gen_order_short_code();
    begin
      insert into orders (customer_name, customer_phone, address, delivery_type, notes, status, total_cop, short_code)
      values (v_customer_name, v_customer_phone, v_address, v_delivery_type, v_notes, 'pending', 0, v_short_code)
      returning id into v_order_id;
      exit; -- inserted successfully
    exception when unique_violation then
      -- extremely rare; try another code
    end;
  end loop;

  -- ---- price each item from the catalog (identical to 0002) ----
  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_product_id := (v_item->>'productId')::uuid;
    v_qty        := coalesce((v_item->>'qty')::integer, 0);
    if v_qty <= 0 then raise exception 'invalid_qty'; end if;

    select id, name, price_cop into v_product
      from products where id = v_product_id and is_active = true;
    if not found then raise exception 'product_not_found'; end if;

    insert into order_items (order_id, product_id, product_name, qty, unit_price_cop)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price_cop);
    -- line_total_cop is GENERATED (0001_init.sql line 140); never assigned here.

    v_total := v_total + (v_product.price_cop * v_qty);
  end loop;

  update orders set total_cop = v_total where id = v_order_id;

  return v_short_code;
end;
$$;

grant execute on function create_order(jsonb) to anon, authenticated;
```

`lib/actions/orders.ts` needs no change: line 76 already returns `orderId as string`, which is now the short code.

**If Step 6 is deferred:** Database changes = **None.** Keep `create_order` returning `uuid`; `orderRef` is the uuid everywhere.

## Demo-mode parity
- `lib/actions/orders.ts` demo branch (lines 36-51) is **untouched**: still prices against `SEED_PRODUCTS`, recomputes the total, returns `{ ok: true, orderId: randomUUID() }` with no persistence. The hard rule (branch on `hasSupabaseEnv()`, keep the seed fallback) holds — the only new demo-mode work is a client-side `sessionStorage` write in `CheckoutForm`, which touches no server data path.
- `app/order/[id]/page.tsx` calls `getOrderById` **only inside** the `hasSupabaseEnv()` branch (Step 4); in demo mode `serverSummary` is `null` and the page relies on the `sessionStorage` payload, then the generic fallback link. The page stays `force-dynamic` and never requires a DB.
- **Static build of `/` and `/menu` is unaffected:** this plan touches only `app/order/[id]` (already `force-dynamic`), `components/checkout/*`, the new `components/order/*`, and `lib/*` (plus the optional migration + `lib/types.ts`/`lib/queries/orders.ts` for Step 6). No change to `app/page.tsx`, `app/menu/page.tsx`, `lib/seed-data.ts`, or the menu query path, so `npm run build` continues to statically generate the storefront and menu from seed data.
- `formatCop()` is used for every money value in the message; prices remain integer COP, never floats.

## Affected files
- **Create** `lib/whatsapp.ts` — message + link builder (Step 1).
- **Create** `components/order/WhatsAppHandoff.tsx` — client handoff button with source-priority + sessionStorage read (Step 3).
- **Edit** `app/order/[id]/page.tsx` — opportunistic DB `getOrderById` branch, build `serverSummary`, render `WhatsAppHandoff`, remove the old static link/`message`; keep `Container` + `SnowflakeIcon` imports (Steps 4, 5).
- **Edit** `components/checkout/CheckoutForm.tsx` — write `sessionStorage` summary before `clear()` on success (Step 2).
- **Edit (only if Step 6)** `lib/types.ts` (add `shortCode?: string | null` to `Order`), `lib/queries/orders.ts` (extend `OrderRow`, add `short_code` to both `.select(...)` strings at lines 64-66 / 94-96, map it in `mapOrderRow`).
- **Create (only if Step 6)** `supabase/migrations/0003_order_short_code.sql`.
- **No change** to `lib/actions/orders.ts` (line 76 already returns the RPC string; Step 6 only changes its meaning from uuid to short code).
- **Reuse, no change:** `lib/config.ts` (`whatsappUrl`, `WHATSAPP_NUMBER`), `lib/format.ts` (`formatCop`), `components/icons/index.ts` (`WhatsAppIcon`), `components/ui/Container.tsx`, `lib/validation/schemas.ts`.

## Verification
Gates:
1. `npx tsc --noEmit` — types clean (`WhatsAppOrderSummary` props serialize across the server/client boundary; `shortCode?` if added).
2. `npm run lint` — ESLint flat config passes.
3. `npm run build` — canonical gate; confirm `/` and `/menu` still statically generate and `/order/[id]` stays dynamic.

Manual checks (drive the running app at **desktop and mobile** widths against `design/PolarUIPrototype.png`):
- **Demo mode (no Supabase env):** add 2-3 products, checkout as `delivery` with an address + notes, confirm. On `/order/[id]`, click "Enviar pedido por WhatsApp" and verify the prefilled message contains: the order ref, `Cliente`/`Telefono`, `Entrega: Domicilio`, `Direccion`, each `nombre x qty = line total` via `formatCop`, the correct `Total`, `Notas`, and the `Pago contra entrega` line. Repeat as `pickup` (no `Direccion` line). Verify the cart is cleared after redirect and the message still renders (sessionStorage carried it).
- **Demo fallback:** hard-reload `/order/[id]` after the message already opened / sessionStorage cleared, or open the URL with a random id — the button must still produce a valid generic `wa.me` link (no crash, no empty `text`).
- **Empty cart / error states:** confirm the existing empty-cart card (`CheckoutForm` lines 88-102) and `formError` path (lines 200-207) are unchanged and still block submission.
- **DB mode (with Supabase env from plan 01):** place a real order; confirm it persists (visible in `/admin/orders`). On the customer's confirmation page, the WhatsApp message is carried by `sessionStorage` (the customer cannot SELECT the order — RLS); verify the message totals match the admin's order detail. If Step 6 shipped, confirm the short code (`POL-XXXXXX`) is the route ref, shows on the "Número de pedido" card, and appears in the message; confirm it also shows in `/admin/orders`.
- **DB reload edge:** after a full reload that clears `sessionStorage`, the customer page degrades to the generic link (expected, since RLS blocks reading the order) — the button must still be valid, not empty.
- **Pop-up resilience / mobile:** on a phone, tapping the button hands off to the WhatsApp app with the message prefilled; confirm `target="_blank" rel="noopener noreferrer"` is not blocked (anchor click is gesture-driven).
- **Encoding:** verify `x`, newlines, and any accents survive `encodeURIComponent` in `whatsappUrl` and render as separate lines in WhatsApp.

Explicitly confirm after all edits: **demo mode still works end-to-end with no env**, and the **static build of `/` and `/menu` still passes** (they are not in the change set).

## Risks & open questions
- The deep link needs the **real** `WHATSAPP_NUMBER`; with the placeholder `573000000000` the message is fully testable but won't reach the shop until plan 01 sets the number — final smoke test is gated on that.
- **RLS reality:** `orders` has **no public SELECT** (`0002_rls.sql` lines 56-74); `getOrderById` uses the anon server client, so the customer cannot read their own order — `serverSummary` is almost always `null` for the real customer. The `sessionStorage` payload written at confirm time is therefore the reliable carrier in **both** modes. This is safe: the carried total is display-only and the authoritative total is computed in the `create_order` RPC / demo branch.
- **Pop-up blockers / in-app browsers** (Instagram/Facebook webview) can swallow a programmatic `window.open` fired after the async `createOrder`. The confirmation-page button (a real anchor click) is the reliable path; any auto-open is best-effort only.
- Demo orders are **not persisted**, so the message is carried via `sessionStorage` (`polar_last_order`). On hard reload after it's consumed, the page degrades to the generic link — covered by the Step 3 fallback.
- The `sessionStorage` payload is **display-only, client-trusted** data; it must never feed price/total computation. The authoritative total is recomputed server-side in `createOrder` / the `create_order` RPC.
- **Open:** ship the `short_code` (migration 0003) for launch or defer? Recommended to ship since the shop reads refs aloud, but structured so deferring is a no-op (Database changes = None).
- **Open:** if the short code ships, confirm the route key may switch from uuid to the short code (recommended — RLS blocks the customer from reading the order by either key, and the short code is the human reference the shop wants).
- **Open:** exact Spanish wording / line layout of the message needs a quick brand-voice review.
