import {
  Flame,
  Truck,
  ShieldCheck,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import NavBar from "@/components/NavBar";

export default function Home() {
  const categorias = [
	{ name: "Magic the Gathering", available: true, slug: "catalogo" },
	{ name: "Pokémon", available: false, slug: "pokemon" },
	{ name: "One Piece", available: false, slug: "onepiece" },
	{ name: "YuGiOh", available: false, slug: "yugioh" },
	{ name: "Mitos y Leyendas", available: false, slug: "myl" },
	{ name: "Custom", available: true, slug: "custom" },
  ];

  const features = [
	{ icon: Flame, title: "Impresión Premium", desc: "Papel fotográfico y laminado en calor." },
	{ icon: MapPin, title: "Hecho en Pucón", desc: "Desde el sur de Chile para todo el país." },
	{ icon: Truck, title: "Envíos a todo Chile", desc: "Despacho rápido vía Starken / Chilexpress." },
	{ icon: ShieldCheck, title: "Compra Segura", desc: "Pago con Webpay/Flow o transferencia." },
  ];

  const promos = [
	{ name: "Mazo 60 Glossy", price: "$7.900", desc: "60 cartas con acabado brillante." },
	{ name: "Commander 100 Glossy", price: "$12.900", desc: "100 cartas Glossy para tu EDH." },
	{ name: "Commander 100 Matte", price: "$17.900", desc: "Acabado mate premium, sin reflejo." },
  ];

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<section className="relative px-6 py-20 md:py-32 text-center overflow-hidden">
    	<div className="absolute inset-0 bg-gradient-to-b from-[#FF4D1A]/10 via-transparent to-transparent" />
    	<div className="relative z-10 max-w-4xl mx-auto">
      	<span className="inline-block bg-[#FF4D1A]/20 text-[#FF4D1A] px-3 py-1 rounded-full text-xs font-semibold mb-6">
        	🌋 Hecho en Pucón · Envíos a todo Chile
      	</span>
      	<h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
        	No es solo una carta.
        	<br />
        	<span className="text-[#FF4D1A]">Es tu próxima jugada.</span>
      	</h1>
      	<p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
        	Proxies premium de MTG con impresión fotográfica y laminado en calor.
        	Catálogo completo vía Scryfall, elige el arte que más te guste.
      	</p>
      	<div className="flex flex-col md:flex-row gap-4 justify-center">
        	<a
          	href="/catalogo"
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-8 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        	>
          	<Search size={20} /> Explorar catálogo
        	</a>
        	<a
          	href="/promos"
          	className="border border-white/30 hover:bg-white/10 px-8 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        	>
          	<Sparkles size={20} /> Ver promos
        	</a>
      	</div>
    	</div>
  	</section>

  	<section className="px-6 py-16 bg-[#1E242B]">
    	<div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
      	{features.map(({ icon: Icon, title, desc }) => (
        	<div key={title} className="text-center">
          	<Icon className="text-[#FF4D1A] mx-auto mb-3" size={36} />
          	<h3 className="font-bold mb-2">{title}</h3>
          	<p className="text-sm text-gray-400">{desc}</p>
        	</div>
      	))}
    	</div>
  	</section>

  	<section className="px-6 py-20 max-w-6xl mx-auto">
    	<h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
      	Catálogo por <span className="text-[#FF4D1A]">juego</span>
    	</h2>
    	<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      	{categorias.map((cat) => {
        	const baseClass = `p-6 rounded-xl border transition ${
          	cat.available
            	? "border-[#FF4D1A]/30 hover:border-[#FF4D1A] hover:bg-[#FF4D1A]/5"
            	: "border-white/10 opacity-50 cursor-not-allowed"
        	}`;

        	if (cat.available) {
          	return (
            	<a key={cat.slug} href={`/${cat.slug}`} className={baseClass}>
              	<h3 className="font-bold">{cat.name}</h3>
              	<p className="text-xs text-gray-400 mt-2">Disponible</p>
            	</a>
          	);
        	}
        	return (
          	<div key={cat.slug} className={baseClass}>
            	<h3 className="font-bold">{cat.name}</h3>
            	<p className="text-xs text-gray-400 mt-2">Próximamente</p>
          	</div>
        	);
      	})}
    	</div>
  	</section>

  	<section className="px-6 py-20 bg-gradient-to-r from-[#FF4D1A]/20 to-transparent">
    	<div className="max-w-4xl mx-auto text-center">
      	<h2 className="text-3xl md:text-4xl font-bold mb-4">
        	Promos para armar tu mazo
      	</h2>
      	<p className="text-gray-300 mb-8">
        	Precios especiales por mazo de 60 cartas o Commander 100. Mientras más cartas, mejor precio.
      	</p>
      	<div className="grid md:grid-cols-3 gap-6 text-left">
        	{promos.map((p) => (
          	<div
            	key={p.name}
            	className="bg-[#1E242B] p-6 rounded-xl border border-white/10"
          	>
            	<h3 className="font-bold mb-2">{p.name}</h3>
            	<p className="text-2xl font-bold text-[#FF4D1A] mb-2">{p.price}</p>
            	<p className="text-sm text-gray-400">{p.desc}</p>
          	</div>
        	))}
      	</div>
    	</div>
  	</section>

  	<footer className="px-6 py-10 border-t border-white/10 text-center text-sm text-gray-400">
    	<p>
      	© {new Date().getFullYear()} Volcán Proxies · Hecho en Pucón, Chile 🌋
    	</p>
    	<p className="mt-2">
      	<a
        	href="https://instagram.com/volcanproxies"
        	target="_blank"
        	rel="noreferrer"
        	className="hover:text-white"
      	>
        	Instagram
      	</a>{" "}
      	·{" "}
      	<a
        	href="https://tiktok.com/@volcanproxies"
        	target="_blank"
        	rel="noreferrer"
        	className="hover:text-white"
      	>
        	TikTok
      	</a>
    	</p>
  	</footer>
	</main>
  );
}

