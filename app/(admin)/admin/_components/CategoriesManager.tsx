"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions/categories";
import { categorySchema, type CategorySchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/format";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export function CategoriesManager({
  initial,
  readOnly,
}: {
  initial: CategoryItem[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New-category form state.
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSlugTouched, setNewSlugTouched] = useState(false);
  const [newSort, setNewSort] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Ocurrió un error.");
        return;
      }
      onOk?.();
      router.refresh();
    });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload: CategorySchema = {
      name: newName,
      slug: newSlug || slugify(newName),
      sortOrder: Number.parseInt(newSort, 10) || 0,
      isActive: true,
    };
    const parsed = categorySchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    run(() => createCategory(parsed.data), () => {
      setNewName("");
      setNewSlug("");
      setNewSlugTouched(false);
      setNewSort("");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[rgba(226,69,122,0.4)] bg-[rgba(226,69,122,0.08)] px-4 py-3 text-sm text-[#f3a9c1]"
        >
          {error}
        </p>
      )}

      <div className="glass-card overflow-hidden">
        {initial.length === 0 ? (
          <p className="px-5 py-8 text-sm text-polar-muted">
            No hay categorías todavía.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(167,73,197,0.08)]">
            {initial.map((category) =>
              editingId === category.id ? (
                <EditRow
                  key={category.id}
                  category={category}
                  pending={pending}
                  onCancel={() => setEditingId(null)}
                  onSave={(data) =>
                    run(() => updateCategory(category.id, data), () =>
                      setEditingId(null),
                    )
                  }
                />
              ) : (
                <li
                  key={category.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(25,3,75,0.5)] text-xs font-600 text-polar-muted2">
                    {category.sortOrder}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-600 text-polar-text">
                        {category.name}
                      </p>
                      {!category.isActive && (
                        <span className="rounded-full border border-[rgba(126,119,144,0.4)] bg-[rgba(126,119,144,0.12)] px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide text-polar-dim">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-polar-dim">
                      /{category.slug}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setEditingId(category.id);
                        }}
                        className="text-sm text-polar-magenta transition-colors hover:text-polar-purple-light"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Eliminar la categoría "${category.name}"?`,
                            )
                          ) {
                            run(() => deleteCategory(category.id));
                          }
                        }}
                        className="text-sm text-polar-dim transition-colors hover:text-[#f3a9c1] disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {!readOnly && (
        <form
          onSubmit={handleCreate}
          className="glass-card flex flex-col gap-4 p-6"
        >
          <h2 className="font-display text-lg font-600 text-polar-text">
            Nueva categoría
          </h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (!newSlugTouched) setNewSlug(slugify(e.target.value));
              }}
              placeholder="Nombre"
              className={inputClass}
            />
            <input
              type="text"
              value={newSlug}
              onChange={(e) => {
                setNewSlugTouched(true);
                setNewSlug(e.target.value);
              }}
              placeholder="slug"
              className={inputClass}
            />
            <input
              type="number"
              min={0}
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              placeholder="Orden"
              className={inputClass}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={pending}
              className="btn-brand h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Guardando..." : "Agregar categoría"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function EditRow({
  category,
  pending,
  onCancel,
  onSave,
}: {
  category: CategoryItem;
  pending: boolean;
  onCancel: () => void;
  onSave: (data: CategorySchema) => void;
}) {
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [sort, setSort] = useState(String(category.sortOrder));
  const [isActive, setIsActive] = useState(category.isActive);

  function handleSave() {
    const parsed = categorySchema.safeParse({
      name,
      slug,
      sortOrder: Number.parseInt(sort, 10) || 0,
      isActive,
    });
    if (!parsed.success) return;
    onSave(parsed.data);
  }

  return (
    <li className="flex flex-col gap-3 bg-[rgba(255,255,255,0.02)] px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px]">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Nombre"
        />
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className={inputClass}
          placeholder="slug"
        />
        <input
          type="number"
          min={0}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={inputClass}
          placeholder="Orden"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-polar-text">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 accent-polar-purple"
          />
          Activa
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-polar-muted transition-colors hover:text-polar-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="btn-brand h-10 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "..." : "Guardar"}
          </button>
        </div>
      </div>
    </li>
  );
}

const inputClass = clsx(
  "h-11 w-full rounded-xl border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)] px-4 text-sm text-polar-text placeholder:text-polar-dim outline-none transition-colors",
  "focus:border-polar-purple-light focus:ring-2 focus:ring-[rgba(146,40,218,0.25)]",
);
