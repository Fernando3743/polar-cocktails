"use client";

import { useRef, useState } from "react";
import { uploadPublicImage, type PublicBucket } from "@/lib/storage";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { Field } from "@/components/ui/Field";

interface ImageUploadFieldProps {
  /** Storage bucket the upload targets. */
  bucket: PublicBucket;
  /** Current stored public URL (owned by the parent form's state). */
  imageUrl: string;
  /** Called with the new public URL after a successful upload. */
  onUploaded: (url: string) => void;
  /** Called when the admin clears the current image. */
  onRemove: () => void;
  /** Field label. */
  label?: string;
  /** Validation error for the image field, surfaced under the control. */
  error?: string;
}

/**
 * Shared image upload control for the admin product / combo / promo forms:
 * file input + upload / remove buttons + upload-error message. The parent form
 * keeps owning `imageUrl` (and any live preview state); this component only
 * drives the Supabase Storage upload and reports the resulting URL back.
 */
export function ImageUploadField({
  bucket,
  imageUrl,
  onUploaded,
  onRemove,
  label = "Imagen (opcional)",
  error,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabaseReady = hasSupabaseEnv();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers onChange.
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadPublicImage(bucket, file);
      onUploaded(url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "No pudimos subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field label={label} error={error}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={!supabaseReady || uploading}
        aria-label="Subir imagen"
        className="hidden"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!supabaseReady || uploading}
          className="btn-outline-rect h-11 shrink-0 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading
            ? "Subiendo..."
            : imageUrl.trim()
              ? "Cambiar imagen"
              : "Subir imagen"}
        </button>
        {imageUrl.trim() && (
          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              onRemove();
            }}
            className="text-sm text-polar-dim transition-colors hover:text-[#f3a9c1]"
          >
            Quitar imagen
          </button>
        )}
      </div>
      {!supabaseReady && (
        <p className="text-xs text-polar-dim">
          Configura Supabase para subir imágenes.
        </p>
      )}
      {uploadError && (
        <p className="text-xs text-[#f3a9c1]" role="alert">
          {uploadError}
        </p>
      )}
    </Field>
  );
}
