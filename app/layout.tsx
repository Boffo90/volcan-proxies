import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Volcán Proxies — Proxies de calidad, hechas en Pucón",
  description:
    "Proxies premium de MTG, Pokémon, One Piece, YuGiOh y más. Envíos a todo Chile desde Pucón.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className={montserrat.className}>{children}</body>
    </html>
  );
}