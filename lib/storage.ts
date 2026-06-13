import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

type PublicBucket = "product-images" | "site-assets";

/** Keeps a file extension if present; strips path/query noise from the name. */
function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "archivo";
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned : "archivo";
}

/**
 * Uploads a public image to a Supabase Storage bucket and returns its public
 * URL. Browser-only (uses the browser client); throws when Supabase is not
 * configured so callers can surface the demo-mode notice instead of crashing.
 */
export async function uploadPublicImage(
  bucket: PublicBucket,
  file: File,
): Promise<string> {
  if (!hasSupabaseEnv()) {
    throw new Error("Configura Supabase para subir imágenes.");
  }

  const supabase = createClient();
  const suffix = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const path = `${suffix}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error("No pudimos subir la imagen.");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}
