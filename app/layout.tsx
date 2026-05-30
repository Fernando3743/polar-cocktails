import type { Metadata } from "next";
import { Anton, Poppins, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CartDrawer } from "@/components/cart/CartDrawer";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-hero",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Polar — Cócteles Granizados",
  description:
    "Cócteles granizados con una explosión de frescura. 12 sabores diferentes y 8 combinaciones únicas para todos los gustos. Pide tu domicilio en Tuluá.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} ${inter.variable} ${anton.variable}`}
    >
      <body className="page-bg font-body text-polar-text antialiased min-h-screen">
        <Providers>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <MobileBottomNav />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
