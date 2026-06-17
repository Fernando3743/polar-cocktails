"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { productSchema, type ProductSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/format";
import { uploadPublicImage } from "@/lib/storage";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { PlaceholderCup } from "@/components/icons";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import type { Category } from "@/lib/types";

type FieldKey = keyof ProductSchema;
type FieldErrors = Partial<Record<FieldKey, string>>;

interface ProductFormProps {
  categories: Pick<Category, "name" | "slug">[];
  /** Present when editing; omit for creation. */
  productId?: string;
  initial?: {
    name: string;
    slug: string;
    description: string;
    priceCop: number;
    accentColor: string;
    imageUrl: string | null;
    categorySlug: string;
    sortOrder: number;
    isActive: boolean;
    soldOut: boolean;
    stockQty: number | null;
  };
}

const DEFAULTS = {
  name: "",
  slug: "",
  description: "",
  priceCop: 18000,
  accentColor: "#7C3AED",
  imageUrl: "",
  categorySlug: "",
  sortOrder: 0,
  isActive: true,
  soldOut: false,
  stockQty: null as number | null,
};

export function ProductForm({
  categories,
  productId,
  initial,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(productId);

  const [name, setName] = useState(initial?.name ?? DEFAULTS.name);
  const [slug, setSlug] = useState(initial?.slug ?? DEFAULTS.slug);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(
    initial?.description ?? DEFAULTS.description,
  );
  const [priceCop, setPriceCop] = useState(
    String(initial?.priceCop ?? DEFAULTS.priceCop),
  );
  const [accentColor, setAccentColor] = useState(
    initial?.accentColor ?? DEFAULTS.accentColor,
  );
  const [imageUrl, setImageUrl] = useState(
    initial?.imageUrl ?? DEFAULTS.imageUrl,
  );
  const [categorySlug, setCategorySlug] = useState(
    initial?.categorySlug ??
      categories[0]?.slug ??
      DEFAULTS.categorySlug,
  );
  const [sortOrder, setSortOrder] = useState(
    String(initial?.sortOrder ?? DEFAULTS.sortOrder),
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? DEFAULTS.isActive);
  const [soldOut, setSoldOut] = useState(initial?.soldOut ?? DEFAULTS.soldOut);
  const [stockQty, setStockQty] = useState(
    initial?.stockQty != null ? String(initial.stockQty) : "",
  );

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image upload (Supabase Storage). The submit payload still carries the
  // stored public URL, but admins can only change it through Storage upload.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabaseReady = hasSupabaseEnv();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Whether the current imageUrl failed to render in the live preview.
  const [previewError, setPreviewError] = useState(false);

  const validColor = /^#[0-9a-fA-F]{6}$/.test(accentColor);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers onChange.
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadPublicImage("product-images", file);
      setImageUrl(url);
      setPreviewError(false);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "No pudimos subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const payload: ProductSchema = {
      name,
      slug,
      description,
      priceCop: Number.parseInt(priceCop, 10) || 0,
      accentColor,
      imageUrl: imageUrl.trim() === "" ? "" : imageUrl.trim(),
      categorySlug,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      isActive,
      soldOut,
      stockQty: stockQty.trim() === "" ? null : Number.parseInt(stockQty, 10),
    };

    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldKey | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const result = isEdit
        ? await updateProduct(productId as string, parsed.data)
        : await createProduct(parsed.data);

      if (result.ok) {
        router.push("/admin/products");
        router.refresh();
      } else {
        setFormError(result.error);
        setSubmitting(false);
      }
    } catch {
      setFormError("No pudimos guardar el producto. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="glass-card flex flex-col gap-5 p-6">
        <Field label="Nombre" error={errors.name}>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            aria-label="Nombre"
            className={clsx("input-polar", errors.name && "input-error")}
            placeholder="Polar Blue"
          />
        </Field>

        <Field label="Slug" error={errors.slug}>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            aria-label="Slug"
            className={clsx("input-polar", errors.slug && "input-error")}
            placeholder="polar-blue"
          />
        </Field>

        <Field label="Descripción" error={errors.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            aria-label="Descripción"
            className={clsx(
              "input-polar",
              errors.description && "input-error",
              "min-h-[88px] resize-y py-3",
            )}
            placeholder="Vodka, curaçao blue, limón y azúcar."
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Precio (COP)" error={errors.priceCop}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={priceCop}
              onChange={(e) => setPriceCop(e.target.value)}
              aria-label="Precio (COP)"
              className={clsx("input-polar", errors.priceCop && "input-error")}
            />
          </Field>

          <Field label="Categoría" error={errors.categorySlug}>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={clsx("input-polar", errors.categorySlug && "input-error")}
            >
              {categories.length === 0 && (
                <option value="">Sin categorías</option>
              )}
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Color de acento" error={errors.accentColor}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={validColor ? accentColor : "#7c3aed"}
                onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-[rgba(167,73,197,0.2)] bg-transparent"
                aria-label="Selector de color"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                aria-label="Código de color de acento"
                className={clsx(
                  "input-polar",
                  errors.accentColor && "input-error",
                  "font-mono uppercase",
                )}
                placeholder="#2EA6E0"
              />
            </div>
          </Field>

          <Field label="Orden" error={errors.sortOrder}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Orden"
              className={clsx("input-polar", errors.sortOrder && "input-error")}
            />
          </Field>
        </div>

        <Field label="Imagen (opcional)" error={errors.imageUrl}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={!supabaseReady || uploading}
            aria-label="Subir imagen"
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!supabaseReady || uploading}
              className="btn-outline-rect h-11 shrink-0 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading
                ? "Subiendo..."
                : imageUrl.trim()
                  ? "Cambiar imagen"
                  : "Subir imagen"}
            </button>
            {imageUrl.trim() && (
              <button
                type="button"
                onClick={() => {
                  setImageUrl("");
                  setUploadError(null);
                  setPreviewError(false);
                }}
                className="text-sm text-polar-dim transition-colors hover:text-[#f3a9c1]"
              >
                Quitar imagen
              </button>
            )}
          </div>
          {!supabaseReady && (
            <p className="text-xs text-polar-dim">
              Configura Supabase para subir imágenes.
            </p>
          )}
          {uploadError && (
            <p className="text-xs text-[#f3a9c1]" role="alert">
              {uploadError}
            </p>
          )}
        </Field>

        <Field
          label="Stock disponible (opcional, vacío = sin control)"
          error={errors.stockQty}
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={stockQty}
            onChange={(e) => setStockQty(e.target.value)}
            aria-label="Stock disponible"
            className={clsx("input-polar", errors.stockQty && "input-error")}
            placeholder="Sin control"
          />
          <p className="text-xs text-polar-dim">
            Déjalo vacío para no controlar inventario. Con un número, cada pedido
            descuenta del stock.
          </p>
        </Field>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-polar-purple"
          />
          <span className="text-sm font-600 text-polar-text">
            Activo (visible en la tienda)
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={soldOut}
            onChange={(e) => setSoldOut(e.target.checked)}
            className="h-4 w-4 accent-polar-purple"
          />
          <span className="text-sm font-600 text-polar-text">
            Agotado (no se puede pedir)
          </span>
        </label>

        {formError && <Alert tone="error">{formError}</Alert>}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="btn-brand h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Guardando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear producto"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="btn-ghost h-11 text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="mx-auto w-full max-w-[360px] lg:max-w-none">
        <div className="glass-card flex flex-col items-center gap-4 p-6 lg:sticky lg:top-[104px]">
          <p className="self-start text-xs uppercase tracking-[0.14em] text-polar-dim">
            Vista previa
          </p>
          <div className="flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-[rgba(4,5,18,0.35)] p-3">
            {imageUrl.trim() && !previewError ? (
              // Raw <img> on purpose: the preview must render uploaded Storage
              // URLs without needing next/image remote host configuration.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={name || "Producto"}
                className="h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
                onError={() => setPreviewError(true)}
                onLoad={() => setPreviewError(false)}
              />
            ) : (
              <PlaceholderCup
                accentColor={validColor ? accentColor : "#7C3AED"}
                className="h-full"
              />
            )}
          </div>
          {imageUrl.trim() && previewError && (
            <p className="text-xs text-[#f3a9c1]" role="alert">
              No se pudo cargar la imagen.
            </p>
          )}
          <div className="w-full text-center">
            <p className="font-display text-lg font-600 text-polar-text">
              {name || "Nombre del producto"}
            </p>
            <p className="mt-1 text-xs text-polar-muted">
              {description || "Descripción del producto."}
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
