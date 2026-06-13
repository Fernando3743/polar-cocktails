import type { Metadata, Viewport } from "next";
import { Anton, Poppins } from "next/font/google";
import "./globals.css";
import { siteUrl, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/seo";
import { SITE_NAME } from "@/lib/config";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-hero",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Polar — Cócteles Granizados en Tuluá",
    template: "%s — Polar",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: SITE_NAME,
    url: siteUrl(),
    title: "Polar — Cócteles Granizados en Tuluá",
    description: SITE_DESCRIPTION,
    // app/opengraph-image.png auto-populates og:image — do not also
    // hardcode openGraph.images here, to avoid duplicate tags.
  },
  twitter: {
    card: "summary_large_image",
    title: "Polar — Cócteles Granizados en Tuluá",
    description: SITE_DESCRIPTION,
    // app/twitter-image.png auto-populates twitter:image.
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#040512",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CO"
      className={`${poppins.variable} ${anton.variable}`}
    >
      <body className="page-bg font-body text-polar-text antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
