/** Absolute site origin, no trailing slash. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SITE_DESCRIPTION =
  "Cócteles granizados con una explosión de frescura en Tuluá. " +
  "12 sabores diferentes y 8 combinaciones únicas. Pide por WhatsApp y paga al recibir.";

export const SITE_KEYWORDS = [
  "cócteles granizados",
  "granizados Tuluá",
  "cócteles Tuluá",
  "frozen cocktails",
  "domicilios Tuluá",
  "Polar",
];
