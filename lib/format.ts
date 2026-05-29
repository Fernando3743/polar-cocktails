const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/**
 * Formats an integer COP amount as "$18.000".
 * Strips any whitespace so the symbol sits flush against the digits.
 */
export function formatCop(n: number): string {
  return copFormatter.format(n).replace(/\s/g, "");
}

/**
 * Converts a string into a URL-friendly slug.
 * Strips accents (combining diacritical marks U+0300–U+036F) and
 * non-alphanumerics, collapsing runs into single hyphens.
 */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
