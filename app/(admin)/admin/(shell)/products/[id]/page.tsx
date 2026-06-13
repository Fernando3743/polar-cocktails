import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCategories, getAdminProductById } from "../../../_lib/queries";
import { ProductForm } from "../../../_components/ProductForm";

export const dynamic = "force-dynamic";

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";

  const [categories, product] = await Promise.all([
    getAdminCategories(),
    isNew ? Promise.resolve(null) : getAdminProductById(id),
  ]);

  if (!isNew && !product) {
    notFound();
  }

  const categoryOptions = categories.map((c) => ({
    name: c.name,
    slug: c.slug,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/products"
          className="text-sm text-polar-muted transition-colors hover:text-polar-text"
        >
          ← Productos
        </Link>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          {isNew ? "Nuevo producto" : `Editar: ${product?.name}`}
        </h1>
      </div>

      <ProductForm
        categories={categoryOptions}
        productId={isNew ? undefined : id}
        initial={
          product
            ? {
                name: product.name,
                slug: product.slug,
                description: product.description,
                priceCop: product.priceCop,
                accentColor: product.accentColor,
                imageUrl: product.imageUrl,
                categorySlug: product.categorySlug,
                sortOrder: product.sortOrder,
                isActive: product.isActive,
                soldOut: product.soldOut,
                stockQty: product.stockQty ?? null,
              }
            : undefined
        }
      />
    </div>
  );
}
