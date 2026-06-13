"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  createPromo,
  deletePromo,
  updatePromo,
} from "@/lib/actions/promos";
import { promoSchema, type PromoSchema } from "@/lib/validation/schemas";
import type { AdminPromo, PromoType } from "@/lib/types";
import { formatCop } from "@/lib/format";

function parseIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

// <input type="datetime-local"> uses a local "YYYY-MM-DDTHH:mm" string, but the
// DB stores timestamptz ISO strings. Convert between the two so existing dates
// render in the edit form (a raw ISO value makes the input show blank) and a
// saved value records the correct instant.
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function describeValue(promo: AdminPromo): string {
  return promo.type === "percent"
    ? `${promo.value}% de descuento`
    : `${formatCop(promo.value)} de descuento`;
}

export function PromosManager({
  initial,
  readOnly,
}: {
  initial: AdminPromo[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New-promo form state.
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<PromoType>("percent");
  const [newValue, setNewValue] = useState("");
  const [newMinSubtotal, setNewMinSubtotal] = useState("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");
  const [newMaxRedemptions, setNewMaxRedemptions] = useState("");

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    onOk?: () => void,
  ) {
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
    const payload: PromoSchema = {
      code: newCode,
      type: newType,
      value: parseIntOrNull(newValue) ?? 0,
      minSubtotalCop: parseIntOrNull(newMinSubtotal),
      active: true,
      startsAt: localInputToIso(newStartsAt),
      endsAt: localInputToIso(newEndsAt),
      maxRedemptions: parseIntOrNull(newMaxRedemptions),
    };
    const parsed = promoSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    run(
      () => createPromo(parsed.data),
      () => {
        setNewCode("");
        setNewType("percent");
        setNewValue("");
        setNewMinSubtotal("");
        setNewStartsAt("");
        setNewEndsAt("");
        setNewMaxRedemptions("");
      },
    );
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
            No hay promos todavía.
          </p>
        ) : (
          <ul className="divide-y divide-[rgba(167,73,197,0.08)]">
            {initial.map((promo) =>
              editingId === promo.id ? (
                <EditRow
                  key={promo.id}
                  promo={promo}
                  pending={pending}
                  onCancel={() => setEditingId(null)}
                  onSave={(data) =>
                    run(
                      () => updatePromo(promo.id, data),
                      () => setEditingId(null),
                    )
                  }
                />
              ) : (
                <li
                  key={promo.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-mono text-sm font-600 uppercase tracking-wide text-polar-text">
                        {promo.code}
                      </p>
                      {!promo.active && (
                        <span className="rounded-full border border-[rgba(126,119,144,0.4)] bg-[rgba(126,119,144,0.12)] px-2 py-0.5 text-[10px] font-600 uppercase tracking-wide text-polar-dim">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-polar-dim">
                      {describeValue(promo)}
                      {promo.minSubtotalCop !== null &&
                        ` · desde ${formatCop(promo.minSubtotalCop)}`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-polar-dim">
                      Usos: {promo.timesRedeemed}
                      {promo.maxRedemptions !== null &&
                        ` / ${promo.maxRedemptions}`}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setEditingId(promo.id);
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
                              `¿Eliminar la promo "${promo.code}"?`,
                            )
                          ) {
                            run(() => deletePromo(promo.id));
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
            Nueva promo
          </h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px_120px]">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="Código"
              className={clsx(inputClass, "uppercase")}
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as PromoType)}
              className={inputClass}
            >
              <option value="percent">Porcentaje</option>
              <option value="fixed">Monto fijo</option>
            </select>
            <input
              type="number"
              min={1}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={newType === "percent" ? "%" : "COP"}
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
              Mínimo de subtotal (opcional)
              <input
                type="number"
                min={0}
                value={newMinSubtotal}
                onChange={(e) => setNewMinSubtotal(e.target.value)}
                placeholder="COP"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
              Máximo de usos (opcional)
              <input
                type="number"
                min={1}
                value={newMaxRedemptions}
                onChange={(e) => setNewMaxRedemptions(e.target.value)}
                placeholder="Sin límite"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
              Inicia (opcional)
              <input
                type="datetime-local"
                value={newStartsAt}
                onChange={(e) => setNewStartsAt(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
              Termina (opcional)
              <input
                type="datetime-local"
                value={newEndsAt}
                onChange={(e) => setNewEndsAt(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <div>
            <button
              type="submit"
              disabled={pending}
              className="btn-brand h-11 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Guardando..." : "Agregar promo"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function EditRow({
  promo,
  pending,
  onCancel,
  onSave,
}: {
  promo: AdminPromo;
  pending: boolean;
  onCancel: () => void;
  onSave: (data: PromoSchema) => void;
}) {
  const [code, setCode] = useState(promo.code);
  const [type, setType] = useState<PromoType>(promo.type);
  const [value, setValue] = useState(String(promo.value));
  const [minSubtotal, setMinSubtotal] = useState(
    promo.minSubtotalCop !== null ? String(promo.minSubtotalCop) : "",
  );
  const [maxRedemptions, setMaxRedemptions] = useState(
    promo.maxRedemptions !== null ? String(promo.maxRedemptions) : "",
  );
  const [startsAt, setStartsAt] = useState(
    promo.startsAt ? isoToLocalInput(promo.startsAt) : "",
  );
  const [endsAt, setEndsAt] = useState(
    promo.endsAt ? isoToLocalInput(promo.endsAt) : "",
  );
  const [active, setActive] = useState(promo.active);

  function handleSave() {
    const parsed = promoSchema.safeParse({
      code,
      type,
      value: parseIntOrNull(value) ?? 0,
      minSubtotalCop: parseIntOrNull(minSubtotal),
      active,
      startsAt: localInputToIso(startsAt),
      endsAt: localInputToIso(endsAt),
      maxRedemptions: parseIntOrNull(maxRedemptions),
    });
    if (!parsed.success) return;
    onSave(parsed.data);
  }

  return (
    <li className="flex flex-col gap-3 bg-[rgba(255,255,255,0.02)] px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_120px]">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className={clsx(inputClass, "uppercase")}
          placeholder="Código"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PromoType)}
          className={inputClass}
        >
          <option value="percent">Porcentaje</option>
          <option value="fixed">Monto fijo</option>
        </select>
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
          placeholder={type === "percent" ? "%" : "COP"}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
          Mínimo de subtotal (opcional)
          <input
            type="number"
            min={0}
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
            className={inputClass}
            placeholder="COP"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
          Máximo de usos (opcional)
          <input
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            className={inputClass}
            placeholder="Sin límite"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
          Inicia (opcional)
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-polar-dim">
          Termina (opcional)
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-polar-text">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 accent-polar-purple"
            />
            Activa
          </label>
          <span className="text-xs text-polar-dim">
            Usos: {promo.timesRedeemed}
          </span>
        </div>
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
