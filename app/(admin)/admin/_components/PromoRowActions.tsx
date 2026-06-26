"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePromoBanner } from "@/lib/actions/promos";

export function PromoRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (
      !window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deletePromoBanner(id);
      if (!result.ok) {
        setError(result.error ?? "No se pudo eliminar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-sm text-polar-dim transition-colors hover:text-[#f3a9c1] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "..." : "Eliminar"}
      </button>
      {error && (
        <span className="text-xs text-[#f3a9c1]" role="alert" title={error}>
          !
        </span>
      )}
    </div>
  );
}
