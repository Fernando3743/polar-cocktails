"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  createPromoBanner,
  updatePromoBanner,
} from "@/lib/actions/promos";
import {
  promoBannerSchema,
  type PromoBannerSchema,
} from "@/lib/validation/schemas";
import { PolarLogo } from "@/components/icons";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { ImageUploadField } from "./ImageUploadField";

type FieldKey = keyof PromoBannerSchema;
type FieldErrors = Partial<Record<FieldKey, string>>;

interface PromoBannerFormProps {
  /** Catalog products available as the COMPRAR target. */
  products: { id: string; name: string }[];
  /** Present when editing; omit for creation. */
  bannerId?: string;
  initial?: {
    heading: string;
    imageUrl: string | null;
    productId: string | null;
    href: string | null;
    sortOrder: number;
    isActive: boolean;
  };
}

export function PromoBannerForm({
  products,
  bannerId,
  initial,
}: PromoBannerFormProps) {
  const router = useRouter();
  const isEdit = Boolean(bannerId);

  const [heading, setHeading] = useState(initial?.heading ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [productId, setProductId] = useState(initial?.productId ?? "");
  const [href, setHref] = useState(initial?.href ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [previewError, setPreviewError] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const payload: PromoBannerSchema = {
      heading,
      imageUrl: imageUrl.trim(),
      productId: productId.trim() === "" ? null : productId.trim(),
      href: href.trim(),
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      isActive,
    };

    const parsed = promoBannerSchema.safeParse(payload);
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
        ? await updatePromoBanner(bannerId as string, parsed.data)
        : await createPromoBanner(parsed.data);

      if (result.ok) {
        router.push("/admin/promos");
        router.refresh();
      } else {
        setFormError(result.error);
        setSubmitting(false);
      }
    } catch {
      setFormError("No pudimos guardar el banner. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-6 lg:grid-cols-[1fr_280px]"
    >
      <div className="glass-card flex flex-col gap-5 p-6">
        <Field label="Titular" error={errors.heading}>
          <input
            type="text"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            aria-label="Titular"
            className={clsx("input-polar", errors.heading && "input-error")}
            placeholder="¿Ya probaste el nuevo Moscow Mule?"
          />
        </Field>

        <Field
          label="Producto que agrega COMPRAR (opcional)"
          error={errors.productId}
        >
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={clsx("input-polar", errors.productId && "input-error")}
          >
            <option value="">Sin producto (usa enlace)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-polar-dim">
            Si eliges un producto, COMPRAR lo agrega al carrito. Si no, usa el
            enlace de abajo.
          </p>
        </Field>

        <Field label="Enlace COMPRAR (si no hay producto)" error={errors.href}>
          <input
            type="url"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            aria-label="Enlace"
            className={clsx("input-polar", errors.href && "input-error")}
            placeholder="https://..."
          />
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

        <ImageUploadField
          bucket="site-assets"
          imageUrl={imageUrl}
          error={errors.imageUrl}
          onUploaded={(url) => {
            setImageUrl(url);
            setPreviewError(false);
          }}
          onRemove={() => {
            setImageUrl("");
            setPreviewError(false);
          }}
        />

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
                : "Crear banner"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/promos")}
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
          <div className="relative flex h-32 w-full items-center overflow-hidden rounded-xl bg-[linear-gradient(110deg,#19034b,#5d2da9,#b231ca)]">
            {imageUrl.trim() && !previewError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={heading || "Banner"}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setPreviewError(true)}
                onLoad={() => setPreviewError(false)}
              />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,5,18,0.78),rgba(4,5,18,0.1))]" />
            <p className="relative z-10 max-w-[70%] px-4 font-display text-sm font-extrabold uppercase leading-tight text-white">
              {heading || "Titular del banner"}
            </p>
          </div>
          {!imageUrl.trim() && (
            <PolarLogo className="h-8 opacity-40" />
          )}
        </div>
      </aside>
    </form>
  );
}
