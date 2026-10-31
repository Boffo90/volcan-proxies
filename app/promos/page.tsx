"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Check } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";
import { usePrecios } from "@/hooks/usePrecios";
import { FINISHES, FINISH_INFO, formatCLP } from "@/lib/pricing";

export default function PromosPage() {
  const router = useRouter();
  const { precios } = usePrecios();

  const perCard = (total: number, cantidad: number) =>
	"≈ " + formatCLP(Math.round(total / cantidad)) + " por carta";

  const vivos = FINISHES.filter((f) => precios.disponible[f]);

  // Solo los acabados que se venden hoy: con los pausados esta página
  // mostraba doce tarjetas, ocho de ellas en gris, y confundía más de lo que
  // informaba. Las combinaciones salen de los datos, así que activar un
  // acabado en /admin/precios las hace aparecer solas.
  const PROMOS = (
	[
  	{ key: "mazo60" as const, qty: 60, titulo: "Mazo 60", contexto: "Ideal para Modern, Standard, Pioneer." },
  	{ key: "commander100" as const, qty: 100, titulo: "Commander 100", contexto: "Tu mazo EDH/Commander completo, con comandante." },
	]
  ).flatMap((promo) =>
	vivos.map((f) => {
  	const info = FINISH_INFO[f];
  	const precio = precios[promo.key][f];
  	return {
    	name: `${promo.titulo} ${info.label}`,
    	price: formatCLP(precio),
    	unitEquiv: perCard(precio, promo.qty),
    	desc: `${promo.qty} cartas. ${promo.contexto}`,
    	features: [
      	`${promo.qty} cartas a elección`,
      	info.desc,
      	`✓ ${info.pro}`,
      	`⚠ ${info.contra}`,
    	],
    	// El Commander 100 Reforzada es el que mejor equilibra precio y calidad.
    	featured: promo.key === "commander100" && f === "reforzada300",
  	};
	})
  );

  return (
	<main className="min-h-screen bg-surface text-ink-soft">
  	<NavBar />

  	<section className="px-6 py-16 max-w-6xl mx-auto">
    	<Reveal className="text-center mb-12">
      	<Sparkles className="mx-auto text-flame-ink mb-4 drop-" size={40} />
      	<h1 className="font-display font-extrabold text-4xl md:text-5xl mb-4">
        	Promos para <span className="text-lava">armar mazo</span>
      	</h1>
      	<p className="text-ink-muted max-w-2xl mx-auto">
        	Mientras más cartas, mejor precio. Estas promos aplican
        	automáticamente al armar tu pedido en el carrito.
      	</p>
    	</Reveal>

    	<div
      	className={
        	// Clases literales: Tailwind no genera las que se arman
        	// concatenando strings.
        	"grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 " +
        	(PROMOS.length >= 4 ? "lg:grid-cols-4" : "max-w-3xl mx-auto")
      	}
    	>
      	{PROMOS.map((p, idx) => (
        	<Reveal
          	key={p.name}
          	delay={idx * 0.08}
          	className={
            	"p-6 rounded-xl relative transition " +
            	(p.featured
              	? "bg-flame-tint border-2 border-ink shadow-[var(--lift-lg)] scale-105"
              	: "glass-card glow-hover")
          	}
        	>
          	{p.featured && (
            	<span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-flame border-2 border-ink text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
              	⭐ MÁS POPULAR
            	</span>
          	)}
          	<h3 className="font-display font-bold text-lg mb-2">{p.name}</h3>
          	<p className="text-3xl font-display font-extrabold text-lava mb-1">
            	{p.price}
          	</p>
          	<p className="text-xs text-ink-muted mb-4">{p.unitEquiv}</p>
          	<p className="text-sm text-ink-soft mb-5">{p.desc}</p>
          	<ul className="space-y-2 mb-6">
            	{p.features.map((f) => (
              	<li
                	key={f}
                	className="flex items-center gap-2 text-sm text-ink-soft"
              	>
                	<Check size={14} className="text-flame-ink flex-shrink-0" />
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
      	<ul className="space-y-2 text-sm text-ink-soft">
        	<li>
          	<b className="text-ink">Aplicación automática:</b> al juntar 60
          	o 100 cartas del mismo acabado, el precio cambia solo. No tienes
          	que elegir la promo ni pedirla.
        	</li>
        	<li>
          	<b className="text-ink">Las promos se suman:</b> si pides 260
          	cartas del mismo acabado, se aplican dos Commander 100 y un Mazo
          	60 en el mismo pedido. No necesitas hacer compras separadas.
        	</li>
        	<li>
          	<b className="text-ink">Cada acabado tiene la suya:</b> si
          	llevas 100 Básicas y 100 Reforzadas, cada grupo recibe su promo. Mezclar
          	acabados ya no te hace perderlas.
        	</li>
        	<li>
          	<b className="text-ink">Nunca pagas de más:</b> las cartas que
          	sobran del tramo se cobran sueltas, así que sumar cartas jamás
          	encarece el pedido.
        	</li>
        	<li>
          	<b className="text-ink">Cartas custom aparte:</b> no suman para
          	la promo porque llevan otro trabajo, pero tampoco la anulan: el
          	resto del pedido la aprovecha igual.
        	</li>
      	</ul>
    	</Reveal>

    	<Reveal className="bg-surface-3 p-6 rounded-xl border border-line mb-8">
      	<h2 className="font-display font-bold text-lg mb-4">
        	Precio por carta unitaria
      	</h2>
      	<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        	{vivos.map((f) => (
          	<div
            	key={f}
            	className="text-center"
          	>
            	<p className="text-xs text-ink-muted uppercase mb-1">
              	{FINISH_INFO[f].label}
            	</p>
            	<p className="text-2xl font-display font-bold text-lava">
              	{formatCLP(precios.unitario[f])}
            	</p>
            	<p className="text-xs text-ink-faint mt-1">
              	por carta
            	</p>
          	</div>
        	))}
      	</div>
    	</Reveal>

    	<Reveal className="text-center">
      	<button
        	onClick={() => router.push("/catalogo")}
        	className="btn-flame px-8 py-4 rounded-lg font-semibold text-lg transition-all"
      	>
        	Armar mi pedido →
      	</button>
    	</Reveal>
  	</section>

  	<Footer />
	</main>
  );
}
