import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
	remotePatterns: [
  	{ protocol: "https", hostname: "cards.scryfall.io" },
  	{ protocol: "https", hostname: "c1.scryfall.com" },
  	{ protocol: "https", hostname: "svgs.scryfall.io" },
  	// Mitos y Leyendas sirve un PNG de ~1,9 MB como única talla. Sesenta de
  	// esos en una grilla son 114 MB, así que las miniaturas pasan por el
  	// optimizador de Next, que además las cachea y evita golpear su
  	// servidor desde el navegador de cada visitante.
  	{ protocol: "https", hostname: "api.myl.cl" },
	],
  },
};

export default nextConfig;

