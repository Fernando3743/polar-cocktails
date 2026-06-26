import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminProducts,
  getAdminPromoBannerById,
} from "../../../_lib/queries";
import { PromoBannerForm } from "../../../_components/PromoBannerForm";

export const dynamic = "force-dynamic";

export default async function AdminPromoEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";

  const [products, banner] = await Promise.all([
    getAdminProducts(),
    isNew ? Promise.resolve(null) : getAdminPromoBannerById(id),
  ]);

  if (!isNew && !banner) {
    notFound();
  }

  const productOptions = products.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/promos"
          className="text-sm text-polar-muted transition-colors hover:text-polar-text"
        >
          ← Promos
        </Link>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          {isNew ? "Nuevo banner" : `Editar: ${banner?.heading}`}
        </h1>
      </div>

      <PromoBannerForm
        products={productOptions}
        bannerId={isNew ? undefined : id}
        initial={
          banner
            ? {
                heading: banner.heading,
                imageUrl: banner.imageUrl,
                productId: banner.productId,
                href: banner.href,
                sortOrder: banner.sortOrder,
                isActive: banner.isActive,
              }
            : undefined
        }
      />
    </div>
  );
}
