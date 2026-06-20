import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight_ : ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Volcán Proxies - Proxies de calidad, hechas en Pucón",
  description: "Proxies premium de MTG, Pokémon, One Piece, YugiOh y más. Envíos a todo Chile desde Pucón. Calidad garantizada para tus juegos de cartas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={montserrat.className}>{children}</body>
    </html>
  );
}
