import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Producto inválido."),
  qty: z.number().int().positive("La cantidad debe ser mayor a cero."),
});

export const orderSchema = z
  .object({
    customerName: z.string().trim().min(2, "Ingresa tu nombre."),
    customerPhone: z
      .string()
      .trim()
      .transform((s) => s.replace(/[\s-]/g, ""))
      .pipe(
        z
          .string()
          .regex(
            /^(\+?57)?3\d{9}$/,
            "Ingresa un celular colombiano válido (10 dígitos).",
          ),
      ),
    address: z.string().trim().optional(),
    deliveryType: z.enum(["delivery", "pickup"]),
    notes: z.string().trim().optional(),
    promoCode: z
      .string()
      .trim()
      .toUpperCase()
      .max(40)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : undefined)),
    items: z.array(orderItemSchema).min(1, "Tu carrito está vacío."),
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
  name: z.string().trim().min(2, "Ingresa un nombre."),
  slug: z.string().trim().min(1, "Ingresa un slug."),
  description: z.string().trim().min(1, "Ingresa una descripción."),
  priceCop: z.number().int().nonnegative("El precio no puede ser negativo."),
  accentColor: hexColor,
  imageUrl: z.string().trim().url("URL inválida.").nullable().or(z.literal("")),
  categorySlug: z.string().trim().min(1, "Selecciona una categoría."),
  sortOrder: z.number().int().nonnegative(),
  isActive: z.boolean(),
  soldOut: z.boolean(),
  stockQty: z.number().int().nonnegative().nullable(), // null = untracked
});

export type ProductSchema = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre."),
  slug: z.string().trim().min(1, "Ingresa un slug."),
  sortOrder: z.number().int().nonnegative(),
  isActive: z.boolean(),
});

export type CategorySchema = z.infer<typeof categorySchema>;

export const promoSchema = z
  .object({
    code: z.string().trim().toUpperCase().min(2, "Ingresa un código.").max(40),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int().positive("El valor debe ser mayor a cero."),
    minSubtotalCop: z.number().int().nonnegative().nullable(),
    active: z.boolean(),
    startsAt: z.string().trim().min(1).nullable(), // ISO or null
    endsAt: z.string().trim().min(1).nullable(),
    maxRedemptions: z.number().int().positive().nullable(),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, {
    message: "El porcentaje no puede superar 100.",
    path: ["value"],
  });

export type PromoSchema = z.infer<typeof promoSchema>;
