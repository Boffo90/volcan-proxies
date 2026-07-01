"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Truck,
  MapPin,
  Search,
  Sparkles,
  FileText,
  Printer,
  Package,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import {
  getRandomCards,
  getCardImage,
  type ScryfallCard,
} from "@/lib/scryfall";

export default function Home() {
  const router = useRouter();
  const [showcase, setShowcase] = useState<ScryfallCard[]>([]);

  useEffect(() => {
	getRandomCards(6).then((cards) => setShowcase(cards));
  }, []);

  const features = [
	{
  	icon: Flame,
  	title: "Impresión Premium",
  	desc: "Papel fotográfico + laminado en calor.",
	},
	{
  	icon: MapPin,
  	title: "Hecho en Pucón",
  	desc: "Desde el sur de Chile para todo el país.",
	},
	{
  	icon: Truck,
  	title: "Despacho 48 hrs",
  	desc: "Envío vía Starken, Chilexpress o Blue Express.",
	},
	{
  	icon: CheckCircle2,
  	title: "Mínimo 9 cartas",
  	desc: "1 hoja completa, máximo aprovechamiento.",
	},
  ];

  const pasos = [
	{
  	icon: FileText,
  	title: "Pega tu lista o busca",
  	desc: "Importa tu mazo de Moxfield/Archidekt o navega el catálogo Scryfall completo.",
	},
	{
  	icon: ShoppingCart,
  	title: "Elige acabado",
  	desc: "Glossy (brillante) o Matte (mate premium). Mezcla cantidades libremente.",
	},
	{
  	icon: Printer,
  	title: "Imprimimos en 48 hrs",
  	desc: "Impresión fotográfica + laminado en calor con bolsas tamaño carta.",
	},
	{
  	icon: Package,
  	title: "Despachamos a tu casa",
  	desc: "Starken, Chilexpress o Blue Express a todo Chile, con tracking incluido.",
	},
  ];

  const promos = [
	{
  	name: "Mazo 60",
  	subtitle: "Glossy",
  	price: "$7.900",
  	desc: "Standard, Modern, Pioneer.",
  	qty: "60 cartas",
  	perCard: "~$132/carta",
	},
	{
  	name: "Commander 100",
  	subtitle: "Glossy",
  	price: "$12.900",
  	desc: "Tu mazo EDH completo.",
  	qty: "100 cartas",
  	perCard: "~$129/carta",
  	featured: true,
	},
	{
  	name: "Commander 100",
  	subtitle: "Matte",
  	price: "$17.900",
  	desc: "Acabado premium sin reflejo.",
  	qty: "100 cartas",
  	perCard: "~$179/carta",
	},
  ];

  const placeholderGradient =
	"linear-gradient(135deg, #1E242B 0%, #0F1115 100%)";

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	{/* HERO */}
  	<section className="relative px-6 pt-16 pb-24 overflow-hidden">
    	<div className="absolute inset-0 bg-gradient-to-br from-[#FF4D1A]/15 via-transparent to-transparent" />
    	<div className="absolute top-20 right-0 w-96 h-96 bg-[#FF4D1A]/10 rounded-full blur-3xl" />

    	<div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
      	<div>
        	<span className="inline-block bg-[#FF4D1A]/20 text-[#FF4D1A] px-3 py-1 rounded-full text-xs font-semibold mb-6">
          	🌋 Hecho en Pucón · Envíos a todo Chile
        	</span>
        	<h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05]">
          	Tu mazo soñado,
          	<br />
          	<span className="text-[#FF4D1A]">sin venderle el alma</span>
          	<br />
          	<span className="text-[#FF4D1A]">a la billetera.</span>
        	</h1>
        	<p className="text-lg text-gray-300 mb-8 max-w-lg">
          	Proxies premium de MTG con impresión fotográfica y laminado en
          	calor. Importa tu mazo entero desde Moxfield o Archidekt en
          	segundos.
        	</p>
        	<div className="flex flex-col sm:flex-row gap-3">
          	<button
            	onClick={() => router.push("/importar")}
            	className="bg-[#FF4D1A] hover:bg-[#e64418] px-7 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          	>
            	<FileText size={20} /> Importar mi mazo
          	</button>
          	<button
            	onClick={() => router.push("/catalogo")}
            	className="border border-white/20 hover:bg-white/5 px-7 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          	>
            	<Search size={20} /> Buscar cartas
          	</button>
        	</div>
      	</div>

      	<div className="relative hidden lg:block">
        	<div className="grid grid-cols-3 gap-3">
          	{Array.from({ length: 6 }).map((_, idx) => {
            	const card = showcase[idx];
            	const bgStyle = card
              	? {
                  	backgroundImage: `url(${getCardImage(card, "normal")})`,
                	}
              	: { background: placeholderGradient };
            	return (
              	<div
                	key={idx}
                	className={
                  	"aspect-[5/7] rounded-xl bg-center bg-cover bg-no-repeat shadow-xl transform transition " +
                  	(idx === 1
                    	? "translate-y-8 scale-105"
                    	: idx === 4
                    	? "-translate-y-4"
                    	: "")
                	}
                	style={bgStyle}
              	/>
            	);
          	})}
        	</div>
        	<div className="absolute -bottom-4 -right-4 bg-[#FF4D1A] text-white px-4 py-2 rounded-lg font-bold shadow-2xl rotate-3">
          	🎴 +30.000 cartas disponibles
        	</div>
      	</div>
    	</div>
  	</section>

  	{/* BANNER IMPORTADOR */}
  	<section className="px-6 py-8 bg-gradient-to-r from-[#FF4D1A] to-[#e64418]">
    	<div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      	<div className="flex items-center gap-4">
        	<FileText size={32} className="text-white flex-shrink-0" />
        	<div>
          	<h3 className="font-bold text-lg">
            	¿Ya tienes tu mazo en Moxfield o Archidekt?
          	</h3>
          	<p className="text-sm text-white/90">
            	Pega tu lista y arma tu pedido en 30 segundos.
          	</p>
        	</div>
      	</div>
      	<button
        	onClick={() => router.push("/importar")}
        	className="bg-white text-[#FF4D1A] px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition whitespace-nowrap"
      	>
        	Importar ahora →
      	</button>
    	</div>
  	</section>

  	{/* FEATURES */}
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

  	{/* CÓMO FUNCIONA */}
  	<section className="px-6 py-20 max-w-6xl mx-auto">
    	<div className="text-center mb-12">
      	<h2 className="text-3xl md:text-5xl font-bold mb-3">
        	Cómo <span className="text-[#FF4D1A]">funciona</span>
      	</h2>
      	<p className="text-gray-400">4 pasos simples. Sin complicaciones.</p>
    	</div>

    	<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      	{pasos.map((paso, idx) => {
        	const Icon = paso.icon;
        	return (
          	<div
            	key={paso.title}
            	className="relative bg-[#1E242B] p-6 rounded-xl border border-white/10 hover:border-[#FF4D1A]/50 transition"
          	>
            	<div className="absolute -top-3 -left-3 bg-[#FF4D1A] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
              	{idx + 1}
            	</div>
            	<Icon className="text-[#FF4D1A] mb-4" size={32} />
            	<h3 className="font-bold mb-2">{paso.title}</h3>
            	<p className="text-sm text-gray-400">{paso.desc}</p>
          	</div>
        	);
      	})}
    	</div>
  	</section>

  	{/* PROMOS */}
  	<section className="px-6 py-20 bg-gradient-to-b from-transparent via-[#1E242B]/50 to-transparent">
    	<div className="max-w-5xl mx-auto">
      	<div className="text-center mb-12">
        	<Sparkles className="mx-auto text-[#FF4D1A] mb-3" size={36} />
        	<h2 className="text-3xl md:text-5xl font-bold mb-3">
          	Promos para <span className="text-[#FF4D1A]">armar mazo</span>
        	</h2>
        	<p className="text-gray-400">
          	Mientras más cartas, mejor precio. Aplican automáticamente.
        	</p>
      	</div>

      	<div className="grid md:grid-cols-3 gap-6 mb-8">
        	{promos.map((p) => (
          	<div
            	key={p.name + p.subtitle}
            	className={
              	"p-6 rounded-xl border transition relative " +
              	(p.featured
                	? "bg-gradient-to-b from-[#FF4D1A]/20 to-[#1E242B] border-[#FF4D1A] scale-105 shadow-2xl"
                	: "bg-[#1E242B] border-white/10")
            	}
          	>
            	{p.featured && (
              	<span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF4D1A] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                	⭐ MÁS POPULAR
              	</span>
            	)}
            	<p className="text-xs text-gray-400 uppercase tracking-wide">
              	{p.subtitle}
            	</p>
            	<h3 className="font-bold text-2xl mt-1 mb-3">{p.name}</h3>
            	<p className="text-4xl font-bold text-[#FF4D1A] mb-1">
              	{p.price}
            	</p>
            	<p className="text-xs text-gray-400 mb-4">{p.perCard}</p>
            	<div className="border-t border-white/10 pt-4 space-y-2 text-sm text-gray-300">
              	<p className="flex items-center gap-2">
                	<CheckCircle2 size={14} className="text-[#FF4D1A]" />{" "}
                	{p.qty}
              	</p>
              	<p className="flex items-center gap-2">
                	<CheckCircle2 size={14} className="text-[#FF4D1A]" />{" "}
                	{p.desc}
              	</p>
              	<p className="flex items-center gap-2">
                	<CheckCircle2 size={14} className="text-[#FF4D1A]" />{" "}
                	Mismo acabado en todas
              	</p>
            	</div>
          	</div>
        	))}
      	</div>

      	<div className="text-center">
        	<button
          	onClick={() => router.push("/promos")}
          	className="text-[#FF4D1A] hover:underline font-semibold"
        	>
          	Ver detalle de promos →
        	</button>
      	</div>
    	</div>
  	</section>

  	{/* CATÁLOGO TEASER */}
  	<section className="px-6 py-20 max-w-6xl mx-auto">
    	<div className="text-center mb-12">
      	<h2 className="text-3xl md:text-5xl font-bold mb-3">
        	Catálogo <span className="text-[#FF4D1A]">completo</span>
      	</h2>
      	<p className="text-gray-400 mb-2">
        	Catálogo vía Scryfall — todas las cartas, todos los sets, todos los
        	artes alternativos.
      	</p>
    	</div>

    	<div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
      	{Array.from({ length: 6 }).map((_, idx) => {
        	const card = showcase[idx];
        	const bgStyle = card
          	? { backgroundImage: `url(${getCardImage(card, "normal")})` }
          	: { background: placeholderGradient };
        	return (
          	<div
            	key={idx}
            	className="aspect-[5/7] rounded-lg bg-center bg-cover bg-no-repeat hover:scale-105 transition cursor-pointer shadow-lg"
            	style={bgStyle}
            	onClick={() => router.push("/catalogo")}
          	/>
        	);
      	})}
    	</div>

    	<div className="text-center">
      	<button
        	onClick={() => router.push("/catalogo")}
        	className="bg-[#FF4D1A] hover:bg-[#e64418] px-7 py-3.5 rounded-lg font-semibold transition inline-flex items-center gap-2"
      	>
        	<Search size={18} /> Explorar catálogo
      	</button>
    	</div>
  	</section>

  	{/* DISCLAIMER ARTESANAL */}
  	<section className="px-6 py-20 max-w-4xl mx-auto">
    	<div className="bg-[#1E242B] border border-white/10 rounded-2xl p-8 md:p-10">
      	<h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
        	Sobre nuestras <span className="text-[#FF4D1A]">cartas</span>
      	</h2>
      	<p className="text-gray-300 mb-8 text-center max-w-2xl mx-auto">
        	Volcán Proxies son{" "}
        	<b className="text-white">proxies artesanales</b> hechas a mano en
        	Pucón con impresión fotográfica y laminado en calor. Queremos ser
        	transparentes sobre qué esperar:
      	</p>

      	<div className="grid md:grid-cols-2 gap-6">
        	<div className="bg-[#0F1115] p-6 rounded-xl border border-green-500/20">
          	<h3 className="font-bold text-green-400 mb-3 flex items-center gap-2">
            	✅ Lo que sí hacemos
          	</h3>
          	<ul className="space-y-2 text-sm text-gray-300">
            	<li>• Cartas con dorso impreso (no quedan en blanco)</li>
            	<li>
              	• Cartas dobles (Double Faced Cards) impresas correctamente
            	</li>
            	<li>• Firmeza similar a una carta real al barajar</li>
            	<li>• Diseño visual fiel desde distancia normal de juego</li>
          	</ul>
        	</div>

        	<div className="bg-[#0F1115] p-6 rounded-xl border border-yellow-500/20">
          	<h3 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
            	⚠️ Lo que NO buscamos
          	</h3>
          	<ul className="space-y-2 text-sm text-gray-300">
            	<li>• Replicar la calidad industrial de Wizards/Konami</li>
            	<li>• Engañar de que son cartas oficiales</li>
            	<li>• Pasar como reales en torneos sancionados</li>
            	<li>• Reemplazar la experiencia de una carta original</li>
          	</ul>
        	</div>
      	</div>

      	<p className="text-center text-gray-400 text-sm mt-6 italic">
        	Son perfectas para playtest, casual, EDH/cEDH, kitchen table y
        	torneos proxy-friendly.
      	</p>
    	</div>
  	</section>

  	{/* CTA FINAL */}
  	<section className="px-6 py-20 bg-gradient-to-r from-[#FF4D1A]/20 via-transparent to-[#FF4D1A]/10">
    	<div className="max-w-3xl mx-auto text-center">
      	<div
        	className="w-20 h-20 mx-auto mb-4 bg-center bg-contain bg-no-repeat"
        	style={{ backgroundImage: "url(/logo.png)" }}
        	role="img"
        	aria-label="Volcán Proxies"
      	/>
      	<h2 className="text-3xl md:text-5xl font-bold mb-4">
        	¿Listo para armar tu próximo mazo?
      	</h2>
      	<p className="text-gray-300 mb-8 text-lg">
        	Importa tu lista o navega el catálogo. Pedido mínimo: 9 cartas (1
        	hoja completa).
      	</p>
      	<div className="flex flex-col sm:flex-row gap-3 justify-center">
        	<button
          	onClick={() => router.push("/importar")}
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-7 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        	>
          	<FileText size={20} /> Importar mi mazo
        	</button>
        	<button
          	onClick={() => router.push("/catalogo")}
          	className="border border-white/20 hover:bg-white/5 px-7 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        	>
          	<Search size={20} /> Buscar cartas
        	</button>
      	</div>
    	</div>
  	</section>

  	<Footer />
	</main>
  );
}

