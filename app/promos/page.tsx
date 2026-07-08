"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";
import { usePrecios } from "@/hooks/usePrecios";
import { formatCLP } from "@/lib/pricing";

export default function PromosPage() {
  const router = useRouter();
  const { precios } = usePrecios();

  const perCard = (total: number, cantidad: number) =>
	"≈ " + formatCLP(Math.round(total / cantidad)) + " por carta";

  const PROMOS = [
	{
  	name: "Mazo 60 Glossy",
  	price: formatCLP(precios.mazo60_glossy),
  	unitEquiv: perCard(precios.mazo60_glossy, 60),
  	desc: "60 cartas con acabado brillante. Ideal para Modern, Standard, Pioneer.",
  	features: [
    	"60 cartas a elección",
    	"Acabado glossy (brillante)",
    	"Impresión fotográfica",
    	"Laminado en calor",
  	],
	},
	{
  	name: "Mazo 60 Matte",
  	price: formatCLP(precios.mazo60_matte),
  	unitEquiv: perCard(precios.mazo60_matte, 60),
  	desc: "60 cartas con acabado mate. Sin reflejo bajo luz.",
  	features: [
    	"60 cartas a elección",
    	"Acabado matte (mate)",
    	"Sin reflejo bajo luz",
    	"Sensación premium",
  	],
	},
	{
  	name: "Commander 100 Glossy",
  	price: formatCLP(precios.commander100_glossy),
  	unitEquiv: perCard(precios.commander100_glossy, 100),
  	desc: "100 cartas Glossy para tu mazo EDH/Commander completo.",
  	features: [
    	"100 cartas a elección",
    	"Acabado glossy (brillante)",
    	"Incluye comandante",
    	"Para EDH/Commander",
  	],
  	featured: true,
	},
	{
  	name: "Commander 100 Matte",
  	price: formatCLP(precios.commander100_matte),
  	unitEquiv: perCard(precios.commander100_matte, 100),
  	desc: "Acabado mate premium, ideal contra reflejos en torneos.",
  	features: [
    	"100 cartas a elección",
    	"Acabado matte (mate)",
    	"Sin reflejo bajo luz",
    	"Sensación premium",
  	],
	},
  ];

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	<section className="px-6 py-16 max-w-6xl mx-auto">
    	<Reveal className="text-center mb-12">
      	<Sparkles className="mx-auto text-[#FF4D1A] mb-4 drop-shadow-[0_0_10px_rgba(255,79,26,0.6)]" size={40} />
      	<h1 className="font-display font-extrabold text-4xl md:text-5xl mb-4">
        	Promos para <span className="text-lava">armar mazo</span>
      	</h1>
      	<p className="text-gray-400 max-w-2xl mx-auto">
        	Mientras más cartas, mejor precio. Estas promos aplican
        	automáticamente al armar tu pedido en el carrito.
      	</p>
    	</Reveal>

    	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      	{PROMOS.map((p, idx) => (
        	<Reveal
          	key={p.name}
          	delay={idx * 0.08}
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
          	<h3 className="font-display font-bold text-lg mb-2">{p.name}</h3>
          	<p className="text-3xl font-display font-extrabold text-lava mb-1">
            	{p.price}
          	</p>
          	<p className="text-xs text-gray-400 mb-4">{p.unitEquiv}</p>
          	<p className="text-sm text-gray-300 mb-5">{p.desc}</p>
          	<ul className="space-y-2 mb-6">
            	{p.features.map((f) => (
              	<li
                	key={f}
                	className="flex items-center gap-2 text-sm text-gray-300"
              	>
                	<Check size={14} className="text-[#FF4D1A] flex-shrink-0" />
                	{f}
              	</li>
            	))}
          	</ul>
        	</Reveal>
      	))}
    	</div>

    	<Reveal className="glass-card p-6 rounded-xl mb-8">
      	<h2 className="font-display font-bold text-lg mb-4">
        	💡 Cómo funcionan las promos
      	</h2>
      	<ul className="space-y-2 text-sm text-gray-300">
        	<li>
          	<b className="text-white">Aplicación automática:</b> al llenar tu
          	carrito con exactamente 60 o 100 cartas del mismo acabado, el
          	precio cambia solo.
        	</li>
        	<li>
          	<b className="text-white">Sin combinar acabados:</b> la promo
          	aplica solo si todas las cartas son Glossy o todas Matte. Si
          	mezclas, se cobra unitario.
        	</li>
        	<li>
          	<b className="text-white">Cartas custom no cuentan:</b> si
          	agregas custom, la promo no aplica al pedido completo.
        	</li>
      	</ul>
    	</Reveal>

    	<Reveal className="bg-[#0b0d11]/60 p-6 rounded-xl border border-white/10 mb-8">
      	<h2 className="font-display font-bold text-lg mb-4">
        	Precio por carta unitaria
      	</h2>
      	<div className="grid grid-cols-2 gap-4">
        	<div className="text-center">
          	<p className="text-xs text-gray-400 uppercase mb-1">Glossy</p>
          	<p className="text-2xl font-display font-bold text-lava">
            	{formatCLP(precios.glossy)}
          	</p>
          	<p className="text-xs text-gray-500 mt-1">por carta</p>
        	</div>
        	<div className="text-center">
          	<p className="text-xs text-gray-400 uppercase mb-1">Matte</p>
          	<p className="text-2xl font-display font-bold text-lava">
            	{formatCLP(precios.matte)}
          	</p>
          	<p className="text-xs text-gray-500 mt-1">por carta</p>
        	</div>
      	</div>
    	</Reveal>

    	<Reveal className="text-center">
      	<button
        	onClick={() => router.push("/catalogo")}
        	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-8 py-4 rounded-lg font-semibold text-lg shadow-[0_10px_30px_-10px_rgba(255,79,26,0.6)] transition-all"
      	>
        	Armar mi pedido →
      	</button>
    	</Reveal>
  	</section>

  	<Footer />
	</main>
  );
}
