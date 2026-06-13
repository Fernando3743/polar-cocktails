import type { Metadata, Viewport } from "next";
import { Anton, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Analytics } from "@/components/seo/Analytics";
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
        <a
          href="#contenido"
          className="sr-only rounded-full bg-polar-purple px-5 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:shadow-[0_8px_24px_rgba(146,40,218,0.4)]"
        >
          Saltar al contenido
        </a>
        <Providers>
          <Navbar />
          <main id="contenido">{children}</main>
          <Footer />
          <MobileBottomNav />
          <CartDrawer />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
