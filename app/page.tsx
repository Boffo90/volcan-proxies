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
import { motion } from "motion/react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";
import Embers from "@/components/animation/Embers";
import {
  getRandomCards,
  getCardImage,
  type ScryfallCard,
} from "@/lib/scryfall";
import { usePrecios } from "@/hooks/usePrecios";
import { formatCLP } from "@/lib/pricing";

export default function Home() {
  const router = useRouter();
  const { precios } = usePrecios();
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

  const perCard = (total: number, cantidad: number) =>
	"~" + formatCLP(Math.round(total / cantidad)) + "/carta";

  const promos = [
	{
  	name: "Mazo 60",
  	subtitle: "Glossy",
  	price: formatCLP(precios.mazo60_glossy),
  	desc: "Standard, Modern, Pioneer.",
  	qty: "60 cartas",
  	perCard: perCard(precios.mazo60_glossy, 60),
	},
	{
  	name: "Commander 100",
  	subtitle: "Glossy",
  	price: formatCLP(precios.commander100_glossy),
  	desc: "Tu mazo EDH completo.",
  	qty: "100 cartas",
  	perCard: perCard(precios.commander100_glossy, 100),
  	featured: true,
	},
	{
  	name: "Commander 100",
  	subtitle: "Matte",
  	price: formatCLP(precios.commander100_matte),
  	desc: "Acabado premium sin reflejo.",
  	qty: "100 cartas",
  	perCard: perCard(precios.commander100_matte, 100),
	},
  ];

  const placeholderGradient =
	"linear-gradient(135deg, #1a1f26 0%, #0b0d11 100%)";

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	{/* HERO */}
  	<section className="relative px-6 pt-20 pb-28 overflow-hidden">
    	<div className="absolute inset-0 bg-gradient-to-br from-[#FF4D1A]/15 via-transparent to-transparent" />
    	<div className="absolute top-20 right-0 w-96 h-96 bg-[#FF4D1A]/15 rounded-full blur-[100px]" />
    	<div className="absolute bottom-0 left-0 w-72 h-72 bg-[#c92a1f]/10 rounded-full blur-[100px]" />
    	<Embers count={16} />

    	<div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
      	<Reveal>
        	<span className="inline-block glass-card text-[#ffb088] px-3 py-1.5 rounded-full text-xs font-semibold mb-6 tracking-wide">
          	🌋 Hecho en Pucón · Envíos a todo Chile
        	</span>
        	<h1 className="font-display font-extrabold text-5xl md:text-6xl lg:text-7xl mb-6 leading-[1.02]">
          	Tu mazo soñado,
          	<br />
          	<span className="text-lava">sin venderle el alma</span>
          	<br />
          	<span className="text-lava">a la billetera.</span>
        	</h1>
        	<p className="text-lg text-gray-300 mb-8 max-w-lg">
          	Proxies premium de MTG con impresión fotográfica y laminado en
          	calor. Importa tu mazo entero desde Moxfield o Archidekt en
          	segundos.
        	</p>
        	<div className="flex flex-col sm:flex-row gap-3">
          	<motion.button
            	whileHover={{ scale: 1.03 }}
            	whileTap={{ scale: 0.97 }}
            	onClick={() => router.push("/importar")}
            	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] px-7 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-[0_10px_40px_-10px_rgba(255,79,26,0.7)]"
          	>
            	<FileText size={20} /> Importar mi mazo
          	</motion.button>
          	<motion.button
            	whileHover={{ scale: 1.03 }}
            	whileTap={{ scale: 0.97 }}
            	onClick={() => router.push("/catalogo")}
            	className="glass-card hover:border-[#FF4D1A]/40 px-7 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          	>
            	<Search size={20} /> Buscar cartas
          	</motion.button>
        	</div>
      	</Reveal>

      	<Reveal delay={0.15} className="relative hidden lg:block">
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
                  	"aspect-[5/7] rounded-xl bg-center bg-cover bg-no-repeat shadow-xl ring-1 ring-white/10 transform transition " +
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
        	<div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-[#ff8a3d] to-[#c92a1f] text-white px-4 py-2 rounded-lg font-display font-bold shadow-2xl rotate-3">
          	🎴 +30.000 cartas disponibles
        	</div>
      	</Reveal>
    	</div>
  	</section>

  	{/* BANNER IMPORTADOR */}
  	<section className="px-6 py-8 bg-gradient-to-r from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f]">
    	<Reveal className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      	<div className="flex items-center gap-4">
        	<FileText size={32} className="text-white flex-shrink-0" />
        	<div>
          	<h3 className="font-display font-bold text-lg">
            	¿Ya tienes tu mazo en Moxfield o Archidekt?
          	</h3>
          	<p className="text-sm text-white/90">
            	Pega tu lista y arma tu pedido en 30 segundos.
          	</p>
        	</div>
      	</div>
      	<motion.button
        	whileHover={{ scale: 1.03 }}
        	whileTap={{ scale: 0.97 }}
        	onClick={() => router.push("/importar")}
        	className="bg-[#0b0d11] text-white px-6 py-3 rounded-lg font-bold whitespace-nowrap shadow-lg"
      	>
        	Importar ahora →
      	</motion.button>
    	</Reveal>
  	</section>

  	{/* FEATURES */}
  	<section className="px-6 py-16 glass-card !bg-[#12151b]/60 !border-0 border-y border-white/5">
    	<div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
      	{features.map(({ icon: Icon, title, desc }, idx) => (
        	<Reveal key={title} delay={idx * 0.08} className="text-center">
          	<div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FF4D1A]/10 mb-3">
            	<Icon className="text-[#FF4D1A]" size={28} />
          	</div>
          	<h3 className="font-display font-bold mb-2">{title}</h3>
          	<p className="text-sm text-gray-400">{desc}</p>
        	</Reveal>
      	))}
    	</div>
  	</section>

  	{/* CÓMO FUNCIONA */}
  	<section className="px-6 py-20 max-w-6xl mx-auto">
    	<Reveal className="text-center mb-12">
      	<h2 className="font-display font-extrabold text-3xl md:text-5xl mb-3">
        	Cómo <span className="text-lava">funciona</span>
      	</h2>
      	<p className="text-gray-400">4 pasos simples. Sin complicaciones.</p>
    	</Reveal>

    	<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      	{pasos.map((paso, idx) => {
        	const Icon = paso.icon;
        	return (
          	<Reveal
            	key={paso.title}
            	delay={idx * 0.08}
            	className="relative glass-card glow-hover rounded-xl p-6"
          	>
            	<div className="absolute -top-3 -left-3 bg-gradient-to-br from-[#ff8a3d] to-[#c92a1f] text-white w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm shadow-lg">
              	{idx + 1}
            	</div>
            	<Icon className="text-[#FF4D1A] mb-4" size={32} />
            	<h3 className="font-display font-bold mb-2">{paso.title}</h3>
            	<p className="text-sm text-gray-400">{paso.desc}</p>
          	</Reveal>
        	);
      	})}
    	</div>
  	</section>

  	{/* PROMOS */}
  	<section className="px-6 py-20 bg-gradient-to-b from-transparent via-[#12151b]/60 to-transparent">
    	<div className="max-w-5xl mx-auto">
      	<Reveal className="text-center mb-12">
        	<Sparkles className="mx-auto text-[#FF4D1A] mb-3" size={36} />
        	<h2 className="font-display font-extrabold text-3xl md:text-5xl mb-3">
          	Promos para <span className="text-lava">armar mazo</span>
        	</h2>
        	<p className="text-gray-400">
          	Mientras más cartas, mejor precio. Aplican automáticamente.
        	</p>
      	</Reveal>

      	<div className="grid md:grid-cols-3 gap-6 mb-8">
        	{promos.map((p, idx) => (
          	<Reveal
            	key={p.name + p.subtitle}
            	delay={idx * 0.1}
            	className={
              	"p-6 rounded-xl relative transition " +
              	(p.featured
                	? "bg-gradient-to-b from-[#FF4D1A]/25 to-[#12151b] border border-[#FF4D1A]/60 scale-105 shadow-[0_20px_60px_-15px_rgba(255,79,26,0.5)]"
                	: "glass-card glow-hover")
            	}
          	>
            	{p.featured && (
              	<span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-br from-[#ff8a3d] to-[#c92a1f] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                	⭐ MÁS POPULAR
              	</span>
            	)}
            	<p className="text-xs text-gray-400 uppercase tracking-wide">
              	{p.subtitle}
            	</p>
            	<h3 className="font-display font-bold text-2xl mt-1 mb-3">{p.name}</h3>
            	<p className="text-4xl font-display font-extrabold text-lava mb-1">
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
          	</Reveal>
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
    	<Reveal className="text-center mb-12">
      	<h2 className="font-display font-extrabold text-3xl md:text-5xl mb-3">
        	Catálogo <span className="text-lava">completo</span>
      	</h2>
      	<p className="text-gray-400 mb-2">
        	Catálogo vía Scryfall — todas las cartas, todos los sets, todos los
        	artes alternativos.
      	</p>
    	</Reveal>

    	<div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
      	{Array.from({ length: 6 }).map((_, idx) => {
        	const card = showcase[idx];
        	const bgStyle = card
          	? { backgroundImage: `url(${getCardImage(card, "normal")})` }
          	: { background: placeholderGradient };
        	return (
          	<Reveal key={idx} delay={idx * 0.05}>
            	<motion.div
              	whileHover={{ y: -4, scale: 1.03 }}
              	className="aspect-[5/7] rounded-lg bg-center bg-cover bg-no-repeat ring-1 ring-white/10 hover:ring-[#FF4D1A]/50 cursor-pointer shadow-lg"
              	style={bgStyle}
              	onClick={() => router.push("/catalogo")}
            	/>
          	</Reveal>
        	);
      	})}
    	</div>

    	<div className="text-center">
      	<button
        	onClick={() => router.push("/catalogo")}
        	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-7 py-3.5 rounded-lg font-semibold transition inline-flex items-center gap-2 shadow-[0_10px_30px_-10px_rgba(255,79,26,0.6)]"
      	>
        	<Search size={18} /> Explorar catálogo
      	</button>
    	</div>
  	</section>

  	{/* DISCLAIMER ARTESANAL */}
  	<section className="px-6 py-20 max-w-4xl mx-auto">
    	<Reveal className="glass-card rounded-2xl p-8 md:p-10">
      	<h2 className="font-display font-extrabold text-2xl md:text-3xl mb-6 text-center">
        	Sobre nuestras <span className="text-lava">cartas</span>
      	</h2>
      	<p className="text-gray-300 mb-8 text-center max-w-2xl mx-auto">
        	Volcán Proxies son{" "}
        	<b className="text-white">proxies artesanales</b> hechas a mano en
        	Pucón con impresión fotográfica y laminado en calor. Queremos ser
        	transparentes sobre qué esperar:
      	</p>

      	<div className="grid md:grid-cols-2 gap-6">
        	<div className="bg-[#0b0d11]/60 p-6 rounded-xl border border-green-500/20">
          	<h3 className="font-display font-bold text-green-400 mb-3 flex items-center gap-2">
            	✅ Lo que sí hacemos
          	</h3>
          	<ul className="space-y-2 text-sm text-gray-300">
            	<li>• Cartas dobles MDFC (Modal Double-Faced) con su reverso real impreso</li>
            	<li>• Firmeza similar a una carta real al barajar</li>
            	<li>• Diseño visual fiel desde distancia normal de juego</li>
          	</ul>
        	</div>

        	<div className="bg-[#0b0d11]/60 p-6 rounded-xl border border-yellow-500/20">
          	<h3 className="font-display font-bold text-yellow-400 mb-3 flex items-center gap-2">
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

      	<p className="text-center text-gray-300 text-sm mt-6">
        	<b className="text-white">Sobre el reverso:</b> por ahora todas
        	nuestras cartas de una sola cara llevan{" "}
        	<b className="text-white">reverso blanco liso</b> (no el reverso
        	oficial de Magic). Las únicas cartas de doble cara que imprimimos
        	con su reverso real son las <b className="text-white">MDFC</b>{" "}
        	(Modal Double-Faced Cards) — no hacemos transform, flip ni otros
        	tipos de carta doble.
      	</p>

      	<p className="text-center text-gray-400 text-sm mt-4 italic">
        	Son perfectas para playtest, casual, EDH/cEDH, kitchen table y
        	torneos proxy-friendly.
      	</p>
    	</Reveal>
  	</section>

  	{/* CTA FINAL */}
  	<section className="relative px-6 py-24 overflow-hidden">
    	<div className="absolute inset-0 bg-gradient-to-r from-[#FF4D1A]/20 via-transparent to-[#c92a1f]/15" />
    	<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[24rem] bg-[#FF4D1A]/10 rounded-full blur-[100px]" />
    	<Reveal className="relative max-w-3xl mx-auto text-center">
      	<div
        	className="w-20 h-20 mx-auto mb-4 bg-center bg-contain bg-no-repeat drop-shadow-[0_0_20px_rgba(255,79,26,0.5)]"
        	style={{ backgroundImage: "url(/logo.png)" }}
        	role="img"
        	aria-label="Volcán Proxies"
      	/>
      	<h2 className="font-display font-extrabold text-3xl md:text-5xl mb-4">
        	¿Listo para armar tu próximo mazo?
      	</h2>
      	<p className="text-gray-300 mb-8 text-lg">
        	Importa tu lista o navega el catálogo. Pedido mínimo: 9 cartas (1
        	hoja completa).
      	</p>
      	<div className="flex flex-col sm:flex-row gap-3 justify-center">
        	<motion.button
          	whileHover={{ scale: 1.03 }}
          	whileTap={{ scale: 0.97 }}
          	onClick={() => router.push("/importar")}
          	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] px-7 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-[0_10px_40px_-10px_rgba(255,79,26,0.7)]"
        	>
          	<FileText size={20} /> Importar mi mazo
        	</motion.button>
        	<motion.button
          	whileHover={{ scale: 1.03 }}
          	whileTap={{ scale: 0.97 }}
          	onClick={() => router.push("/catalogo")}
          	className="glass-card hover:border-[#FF4D1A]/40 px-7 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
        	>
          	<Search size={20} /> Buscar cartas
        	</motion.button>
      	</div>
    	</Reveal>
  	</section>

  	<Footer />
	</main>
  );
}
