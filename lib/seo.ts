/** Absolute site origin, no trailing slash. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  // Prefer the stable production host over the ephemeral per-deployment VERCEL_URL.
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  // No origin resolved. We must distinguish a real (misconfigured) Vercel deploy
  // from a plain local/seed build. Vercel sets VERCEL="1" inside its build and
  // runtime; it also always sets VERCEL_URL, so reaching here on Vercel means the
  // env is broken — fail loudly instead of poisoning canonical/sitemap/JSON-LD URLs
  // with localhost. The zero-env `pnpm build` (NODE_ENV=production, no VERCEL) must
  // NOT throw, since it is the demo/seed correctness gate, so only warn there.
  if (process.env.VERCEL === "1") {
    throw new Error(
      "[siteUrl] No absolute origin could be resolved on Vercel. Set NEXT_PUBLIC_SITE_URL " +
        "(or rely on VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL) before deploying.",
    );
  }
  console.warn(
    "[siteUrl] No NEXT_PUBLIC_SITE_URL set; falling back to http://localhost:3000 — set it for production deploys",
  );
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
