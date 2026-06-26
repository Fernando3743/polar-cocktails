import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminComboById } from "../../../_lib/queries";
import { ComboForm } from "../../../_components/ComboForm";

export const dynamic = "force-dynamic";

export default async function AdminComboEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";

  const combo = isNew ? null : await getAdminComboById(id);

  if (!isNew && !combo) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/combos"
          className="text-sm text-polar-muted transition-colors hover:text-polar-text"
        >
          ← Combos
        </Link>
        <h1 className="font-display text-3xl font-700 text-polar-text">
          {isNew ? "Nuevo combo" : `Editar: ${combo?.name}`}
        </h1>
      </div>

      <ComboForm
        comboId={isNew ? undefined : id}
        initial={
          combo
            ? {
                name: combo.name,
                slug: combo.slug,
                description: combo.description,
                priceCop: combo.priceCop,
                accentColor: combo.accentColor,
                imageUrl: combo.imageUrl,
                sortOrder: combo.sortOrder,
                isActive: combo.isActive,
                soldOut: combo.soldOut,
              }
            : undefined
        }
      />
    </div>
  );
}
