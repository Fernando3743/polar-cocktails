"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { upsertSiteAsset } from "@/lib/actions/site";
import { uploadPublicImage } from "@/lib/storage";
import type { AssetSlot, SiteAsset } from "@/lib/types";

// Display order + Spanish labels per the shared contract.
const SLOT_LABELS: { slot: AssetSlot; label: string; isInstagram: boolean }[] = [
  { slot: "hero_desktop", label: "Imagen principal (escritorio)", isInstagram: false },
  { slot: "hero_mobile", label: "Imagen principal (móvil)", isInstagram: false },
  { slot: "logo", label: "Logo", isInstagram: false },
  { slot: "og_image", label: "Imagen para compartir", isInstagram: false },
  { slot: "instagram_1", label: "Galería de Instagram 1", isInstagram: true },
  { slot: "instagram_2", label: "Galería de Instagram 2", isInstagram: true },
  { slot: "instagram_3", label: "Galería de Instagram 3", isInstagram: true },
  { slot: "instagram_4", label: "Galería de Instagram 4", isInstagram: true },
  { slot: "instagram_5", label: "Galería de Instagram 5", isInstagram: true },
];

type SlotStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function BrandingManager({
  assets,
  hasEnv,
}: {
  assets: SiteAsset[];
  hasEnv: boolean;
}) {
  const bySlot = new Map<AssetSlot, SiteAsset>(assets.map((a) => [a.slot, a]));

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {SLOT_LABELS.map(({ slot, label, isInstagram }) => {
        const asset = bySlot.get(slot);
        return (
          <AssetCard
            key={slot}
            slot={slot}
            label={label}
            isInstagram={isInstagram}
            url={asset?.url ?? ""}
            href={asset?.href ?? ""}
            hasEnv={hasEnv}
          />
        );
      })}
    </div>
  );
}

function AssetCard({
  slot,
  label,
  isInstagram,
  url,
  href,
  hasEnv,
}: {
  slot: AssetSlot;
  label: string;
  isInstagram: boolean;
  url: string;
  href: string;
  hasEnv: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<SlotStatus>({ kind: "idle" });
  const [imgError, setImgError] = useState(false);
  const [hrefValue, setHrefValue] = useState(href);
  const [syncedHref, setSyncedHref] = useState(href);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // After a save + router.refresh(), re-sync the input to the server-confirmed
  // href so it reflects what was actually persisted (and normalized: trimmed,
  // or cleared when stored as null). Adjusted during render (not in an effect)
  // per React's "reset state when a prop changes" pattern.
  if (href !== syncedHref) {
    setSyncedHref(href);
    setHrefValue(href);
  }

  // Persist a url + href pair for this slot, then refresh server data on ok.
  function save(nextUrl: string, nextHref: string) {
    setStatus({ kind: "saving" });
    startTransition(async () => {
      const result = await upsertSiteAsset(slot, {
        url: nextUrl,
        href: nextHref.trim() ? nextHref.trim() : null,
      });
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error });
        return;
      }
      setStatus({ kind: "success" });
      router.refresh();
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus({ kind: "saving" });
    setImgError(false);
    try {
      const publicUrl = await uploadPublicImage("site-assets", file);
      // Preserve any existing href when only the image changes.
      save(publicUrl, hrefValue);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No pudimos subir la imagen.";
      setStatus({ kind: "error", message });
    } finally {
      // Allow re-selecting the same file after a failure.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="glass-card flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-600 text-polar-text">
          {label}
        </h2>
        <StatusLabel status={status} pending={pending} />
      </div>

      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-[rgba(167,73,197,0.2)] bg-[rgba(25,3,75,0.35)]">
        {url && !imgError ? (
          // Raw <img>: the URL may point at a not-yet-whitelisted host and we
          // want the onError fallback rather than next/image's stricter checks.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="px-4 text-center text-xs text-polar-dim">
            {url ? "No se pudo cargar" : "Sin imagen"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`upload-${slot}`} className="text-xs text-polar-dim">
          Subir imagen
        </label>
        <input
          id={`upload-${slot}`}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label="Subir imagen"
          disabled={!hasEnv || pending}
          onChange={handleFile}
          className={clsx(
            "block w-full text-xs text-polar-muted2",
            "file:mr-3 file:cursor-pointer file:rounded-lg file:border-0",
            "file:bg-[linear-gradient(105deg,#a749c5,#9128da)] file:px-4 file:py-2",
            "file:text-xs file:font-600 file:text-white",
            "disabled:cursor-not-allowed disabled:opacity-50 file:disabled:cursor-not-allowed",
          )}
        />
        {!hasEnv && (
          <p className="text-xs text-polar-dim">
            Configura Supabase para subir imágenes.
          </p>
        )}
      </div>

      {isInstagram && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`href-${slot}`} className="text-xs text-polar-dim">
            Enlace (opcional)
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`href-${slot}`}
              type="url"
              aria-label="Enlace de la galería"
              value={hrefValue}
              onChange={(e) => setHrefValue(e.target.value)}
              placeholder="https://instagram.com/..."
              disabled={!hasEnv || pending}
              className="input-polar"
            />
            <button
              type="button"
              disabled={!hasEnv || pending || !url}
              onClick={() => save(url, hrefValue)}
              className="btn-brand h-11 shrink-0 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusLabel({
  status,
  pending,
}: {
  status: SlotStatus;
  pending: boolean;
}) {
  if (pending || status.kind === "saving") {
    return <span className="text-xs text-polar-dim">Guardando...</span>;
  }
  if (status.kind === "success") {
    return <span className="text-xs text-[#7ed9a7]">Guardado</span>;
  }
  if (status.kind === "error") {
    return (
      <span role="alert" className="text-xs text-[#f3a9c1]">
        {status.message}
      </span>
    );
  }
  return null;
}
