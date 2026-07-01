"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
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
  	color: "#FF4D1A",
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
  	color: "#FF4D1A",
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
  	color: "#FF4D1A",
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
  	color: "#FF4D1A",
  	features: [
    	"100 cartas a elección",
    	"Acabado matte (mate)",
    	"Sin reflejo bajo luz",
    	"Sensación premium",
  	],
	},
  ];

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<section className="px-6 py-16 max-w-6xl mx-auto">
    	<div className="text-center mb-12">
      	<Sparkles className="mx-auto text-[#FF4D1A] mb-4" size={40} />
      	<h1 className="text-4xl md:text-5xl font-bold mb-4">
        	Promos para <span className="text-[#FF4D1A]">armar mazo</span>
      	</h1>
      	<p className="text-gray-400 max-w-2xl mx-auto">
        	Mientras más cartas, mejor precio. Estas promos aplican
        	automáticamente al armar tu pedido en el carrito.
      	</p>
    	</div>

    	<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      	{PROMOS.map((p) => (
        	<div
          	key={p.name}
          	className={
            	"p-6 rounded-xl border transition relative " +
            	(p.featured
              	? "bg-gradient-to-b from-[#FF4D1A]/20 to-[#1E242B] border-[#FF4D1A] scale-105"
              	: "bg-[#1E242B] border-white/10")
          	}
        	>
          	{p.featured && (
            	<span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF4D1A] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
              	⭐ MÁS POPULAR
            	</span>
          	)}
          	<h3 className="font-bold text-lg mb-2">{p.name}</h3>
          	<p className="text-3xl font-bold text-[#FF4D1A] mb-1">
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
        	</div>
      	))}
    	</div>

    	<div className="bg-[#1E242B] p-6 rounded-xl border border-white/10 mb-8">
      	<h2 className="font-bold text-lg mb-4">
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
    	</div>

    	<div className="bg-[#0F1115] p-6 rounded-xl border border-white/10 mb-8">
      	<h2 className="font-bold text-lg mb-4">
        	Precio por carta unitaria
      	</h2>
      	<div className="grid grid-cols-2 gap-4">
        	<div className="text-center">
          	<p className="text-xs text-gray-400 uppercase mb-1">Glossy</p>
          	<p className="text-2xl font-bold text-[#FF4D1A]">
            	{formatCLP(precios.glossy)}
          	</p>
          	<p className="text-xs text-gray-500 mt-1">por carta</p>
        	</div>
        	<div className="text-center">
          	<p className="text-xs text-gray-400 uppercase mb-1">Matte</p>
          	<p className="text-2xl font-bold text-[#FF4D1A]">
            	{formatCLP(precios.matte)}
          	</p>
          	<p className="text-xs text-gray-500 mt-1">por carta</p>
        	</div>
      	</div>
    	</div>

    	<div className="text-center">
      	<button
        	onClick={() => router.push("/catalogo")}
        	className="bg-[#FF4D1A] hover:bg-[#e64418] px-8 py-4 rounded-lg font-semibold text-lg transition"
      	>
        	Armar mi pedido →
      	</button>
    	</div>
  	</section>

  	<Footer />
	</main>
  );
}

