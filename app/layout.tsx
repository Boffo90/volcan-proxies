import type { Metadata } from "next";
import { Montserrat, Syne } from "next/font/google";
import "./globals.css";
import AuthListener from "@/components/AuthListener";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-syne",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.volcanproxies.cl"),

  title: {
    default: "Volcán Proxies | Proxies MTG Premium en Chile",
    template: "%s | Volcán Proxies",
  },

  description:
    "Compra proxies premium de Magic: The Gathering, Pokémon, One Piece, Yu-Gi-Oh! y otros TCG. Impresión fotográfica de alta calidad, acabado Glossy o Matte y envíos a todo Chile desde Pucón.",

  keywords: [
    "proxies mtg chile",
    "proxies magic chile",
    "proxies commander",
    "proxies cedh",
    "cartas proxy",
    "magic the gathering chile",
    "proxies pokemon chile",
    "proxies one piece",
    "proxies yugioh",
    "cartas personalizadas",
    "proxies premium",
    "proxies pucon",
  ],

  authors: [{ name: "Volcán Proxies" }],
  creator: "Volcán Proxies",
  publisher: "Volcán Proxies",

  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "https://www.volcanproxies.cl",
    siteName: "Volcán Proxies",
    title: "Volcán Proxies | Proxies MTG Premium en Chile",
    description:
      "Proxies premium para MTG, Pokémon, One Piece y más. Envíos a todo Chile desde Pucón.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Volcán Proxies",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Volcán Proxies | Proxies MTG Premium en Chile",
    description:
      "Proxies premium para MTG, Pokémon, One Piece y más.",
    images: ["/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: "https://www.volcanproxies.cl",
  },

  category: "shopping",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={montserrat.variable + " " + syne.variable}>
      <body className={montserrat.className}>
        <AuthListener />
        {children}
      </body>
    </html>
  );
}