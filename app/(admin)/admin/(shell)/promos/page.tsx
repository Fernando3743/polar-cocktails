import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { ProductThumb } from "@/components/menu/ProductThumb";
import { DemoModeNotice } from "@/components/ui/DemoModeNotice";
import { getAdminPromoBanners, getAdminProducts } from "../../_lib/queries";
import { PromoRowActions } from "../../_components/PromoRowActions";

export const dynamic = "force-dynamic";

export default async function AdminPromosPage() {
  const [banners, products] = await Promise.all([
    getAdminPromoBanners(),
    getAdminProducts(),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-700 text-polar-text">
            Promos
          </h1>
          <p className="mt-1 text-sm text-polar-muted">
            {banners.length} banner{banners.length === 1 ? "" : "s"} en la
            sección Nuevo.
          </p>
        </div>
        <Link href="/admin/promos/new" className="btn-brand h-11 text-sm">
          Nuevo banner
        </Link>
      </header>

      {!hasSupabaseEnv() && (
        <DemoModeNotice>
          Base de datos no configurada: banners de demostración (solo lectura).
        </DemoModeNotice>
      )}

      <div className="glass-card overflow-hidden">
        {banners.length === 0 ? (
          <p className="px-5 py-8 text-sm text-polar-muted">
            No hay banners todavía.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(167,73,197,0.08)]">
            {banners.map((banner) => (
              <li key={banner.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgba(25,3,75,0.4)]">
                  <ProductThumb
                    src={banner.imageUrl}
                    alt={banner.heading}
                    width={48}
                    height={48}
                    placeholderClassName="h-10 w-10"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-600 text-polar-text">
                      {banner.heading}
                    </p>
                    {!banner.isActive && (
                      <span className="rounded-full border border-[rgba(126,119,144,0.4)] bg-[rgba(126,119,144,0.12)] px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide text-polar-dim">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-polar-dim">
                    {banner.productId
                      ? `Compra: ${productName.get(banner.productId) ?? "producto"}`
                      : banner.href
                        ? `Enlace: ${banner.href}`
                        : "Sin destino"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/admin/promos/${banner.id}`}
                    className="text-sm text-polar-magenta transition-colors hover:text-polar-purple-light"
                  >
                    Editar
                  </Link>
                  <PromoRowActions id={banner.id} name={banner.heading} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
