import { z } from "zod";

/**
 * The exact Supabase Storage hostname to pin image URLs to, derived from
 * NEXT_PUBLIC_SUPABASE_URL when set. In demo/zero-env (unset) this is null and
 * the guard falls back to broad "*.supabase.co" acceptance so the seed/build
 * path keeps working without any Supabase configuration.
 */
function pinnedImageHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Image/asset URL guard (IMG-1/IMG-2). Accepts ONLY:
 *  - "" (empty, i.e. no image)
 *  - a site-relative path starting with "/"
 *  - an https:// URL whose host is the pinned Supabase host (when
 *    NEXT_PUBLIC_SUPABASE_URL is set) or any "*.supabase.co" host (demo/zero-env)
 * Rejects http:, data:, javascript:, ftp:, and any other host. Reused by both
 * productSchema.imageUrl and the site asset url so every image path agrees.
 */
function isAllowedImageUrl(value: string): boolean {
  if (value === "") return true;
  // Site-relative paths only (a bare "/" or "/path/..."); reject "//host" which
  // a browser treats as a protocol-relative absolute URL.
  if (value.startsWith("/")) return !value.startsWith("//");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  const pinned = pinnedImageHost();
  if (pinned) return host === pinned;
  return host === "supabase.co" || host.endsWith(".supabase.co");
}

const imageUrlSchema = z
  .string()
  .trim()
  .refine(isAllowedImageUrl, "Usa una imagen subida (Supabase) o deja vacío.");

const orderItemSchema = z.object({
  productId: z.string().min(1, "Producto inválido."),
  qty: z
    .number()
    .int()
    .min(1, "La cantidad debe ser mayor a cero.")
    .max(99, "Cantidad máxima 99 por producto."),
});

export const orderSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, "Ingresa tu nombre.")
      .max(80, "El nombre es demasiado largo."),
    customerPhone: z
      .string()
      .trim()
      // Normalize pasted formats like "(300) 123 4567" or "300.123.4567":
      // keep only digits and a single leading '+', then validate.
      .transform((s) => {
        const plus = s.startsWith("+") ? "+" : "";
        return plus + s.replace(/\D/g, "");
      })
      .pipe(
        z
          .string()
          .regex(
            /^(\+?57)?3\d{9}$/,
            "Ingresa un celular colombiano válido (10 dígitos).",
          ),
      ),
    address: z
      .string()
      .trim()
      .max(200, "La dirección es demasiado larga.")
      .optional(),
    deliveryType: z.enum(["delivery", "pickup"]),
    notes: z
      .string()
      .trim()
      .max(500, "Las notas son demasiado largas.")
      .optional(),
    items: z
      .array(orderItemSchema)
      .min(1, "Tu carrito está vacío.")
      .max(50, "Demasiados productos en el pedido."),
  })
  .refine(
    (data) =>
      data.deliveryType !== "delivery" ||
      (data.address !== undefined && data.address.trim().length > 0),
    {
      message: "La dirección es obligatoria para domicilio.",
      path: ["address"],
    },
  );

export type OrderSchema = z.infer<typeof orderSchema>;

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido (#RRGGBB).");

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresa un nombre.")
    .max(120, "El nombre es demasiado largo."),
  slug: z.string().trim().min(1, "Ingresa un slug."),
  description: z
    .string()
    .trim()
    .min(1, "Ingresa una descripción.")
    .max(2000, "La descripción es demasiado larga."),
  priceCop: z
    .number()
    .int()
    .nonnegative("El precio no puede ser negativo.")
    .max(100000000),
  accentColor: hexColor,
  imageUrl: imageUrlSchema.nullable(),
  categorySlug: z.string().trim().min(1, "Selecciona una categoría."),
  sortOrder: z.number().int().nonnegative().max(1000000),
  isActive: z.boolean(),
  soldOut: z.boolean(),
  stockQty: z.number().int().nonnegative().max(1000000).nullable(), // null = untracked
});

export type ProductSchema = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre."),
  slug: z.string().trim().min(1, "Ingresa un slug."),
  sortOrder: z.number().int().nonnegative().max(1000000),
  isActive: z.boolean(),
});

export type CategorySchema = z.infer<typeof categorySchema>;

// Editable image slots, validated for the site_assets table. The url reuses the
// shared image guard (IMG-1/IMG-2); href is an optional outbound link.
const ASSET_SLOTS = [
  "hero_desktop",
  "hero_mobile",
  "logo",
  "og_image",
  "instagram_1",
  "instagram_2",
  "instagram_3",
  "instagram_4",
  "instagram_5",
] as const;

export const siteAssetSchema = z.object({
  slot: z.enum(ASSET_SLOTS),
  url: imageUrlSchema,
  href: z
    .string()
    .trim()
    .url("URL inválida.")
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  sortOrder: z.number().int().nonnegative().max(1000000),
});

export type SiteAssetSchema = z.infer<typeof siteAssetSchema>;

const openingHourSchema = z.object({
  label: z.string().trim().min(1, "Ingresa una etiqueta.").max(40),
  value: z.string().trim().min(1, "Ingresa un horario.").max(80),
});

export const shopSettingsSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(
      z
        .string()
        .regex(
          /^\d{10,15}$/,
          "Ingresa el WhatsApp con código de país (solo dígitos).",
        ),
    ),
  addressLines: z.array(z.string().trim().min(1).max(120)).max(6),
  mapsUrl: z
    .string()
    .trim()
    .url("URL inválida.")
    .or(z.literal(""))
    .transform((v) => (v ? v : "")),
  socialLinks: z.object({
    instagram: z.string().trim(),
    facebook: z.string().trim(),
    tiktok: z.string().trim(),
  }),
  openingHours: z.array(openingHourSchema).max(14),
});

export type ShopSettingsSchema = z.infer<typeof shopSettingsSchema>;

// Order status guard (SEC-2). Kept as an explicit enum because ORDER_STATUSES
// in app/(admin)/admin/_lib/status.ts is typed as OrderStatus[] (not a literal
// tuple) and so cannot be fed to z.enum directly.
export const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "delivered",
  "cancelled",
]);

export type OrderStatusSchema = z.infer<typeof orderStatusSchema>;

// Admin management (super-admin only). Used by lib/actions/admins.ts to create a
// panel admin via the service-role API and to reset an admin's password.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Correo inválido.");

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.");

export const createAdminSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type CreateAdminSchema = z.infer<typeof createAdminSchema>;
