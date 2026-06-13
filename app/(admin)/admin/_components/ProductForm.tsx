"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { productSchema, type ProductSchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/format";
import { PlaceholderCup } from "@/components/icons";
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

  const validColor = /^#[0-9a-fA-F]{6}$/.test(accentColor);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
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
            className={inputClass(!!errors.name)}
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
            className={inputClass(!!errors.slug)}
            placeholder="polar-blue"
          />
        </Field>

        <Field label="Descripción" error={errors.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={clsx(inputClass(!!errors.description), "min-h-[88px] resize-y py-3")}
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
              className={inputClass(!!errors.priceCop)}
            />
          </Field>

          <Field label="Categoría" error={errors.categorySlug}>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={inputClass(!!errors.categorySlug)}
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
                className={clsx(inputClass(!!errors.accentColor), "font-mono uppercase")}
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
              className={inputClass(!!errors.sortOrder)}
            />
          </Field>
        </div>

        <Field label="URL de imagen (opcional)" error={errors.imageUrl}>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className={inputClass(!!errors.imageUrl)}
            placeholder="https://..."
          />
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
            className={inputClass(!!errors.stockQty)}
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

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-[rgba(226,69,122,0.4)] bg-[rgba(226,69,122,0.08)] px-4 py-3 text-sm text-[#f3a9c1]"
          >
            {formError}
          </p>
        )}

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
      <aside>
        <div className="glass-card flex flex-col items-center gap-4 p-6 lg:sticky lg:top-[104px]">
          <p className="self-start text-xs uppercase tracking-[0.14em] text-polar-dim">
            Vista previa
          </p>
          <div className="flex h-40 w-full items-center justify-center">
            {imageUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={name || "Producto"}
                className="h-40 w-full rounded-xl object-cover"
              />
            ) : (
              <PlaceholderCup
                accentColor={validColor ? accentColor : "#7C3AED"}
                className="h-40"
              />
            )}
          </div>
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

function inputClass(hasError: boolean): string {
  return clsx(
    "h-11 w-full rounded-xl border bg-[rgba(25,3,75,0.35)] px-4 text-sm text-polar-text placeholder:text-polar-dim outline-none transition-colors",
    "focus:border-polar-purple-light focus:ring-2 focus:ring-[rgba(146,40,218,0.25)]",
    hasError ? "border-[rgba(226,69,122,0.6)]" : "border-[rgba(167,73,197,0.2)]",
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-600 text-polar-text">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-[#f3a9c1]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
