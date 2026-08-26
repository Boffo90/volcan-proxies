"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Layers,
  Sun,
  Shield,
  Sparkles,
  Wallet,
  Hand,
  Check,
  AlertTriangle,
} from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";
import { usePrecios } from "@/hooks/usePrecios";
import { FINISHES, FINISH_INFO, formatCLP, type Finish } from "@/lib/pricing";

type Detalle = {
  proceso: string[];
  sensacion: string;
  idealPara: string;
  /** Para la tabla comparativa. */
  grosor: string;
  brillo: string;
  durabilidad: string;
};

// El detalle de fabricación vive acá y no en lib/pricing porque es copy de
// venta, no un dato de precio. FINISH_INFO sigue siendo la fuente del nombre
// y del pro/contra, así que la página nunca se contradice con el selector.
const DETALLE: Record<Finish, Detalle> = {
  base300: {
	proceso: [
  	"Impresión sobre papel fotográfico de 300g doble faz, semibrillo.",
  	"Sin laminado: la carta sale directo de la impresora al corte.",
	],
	sensacion:
  	"Superficie semibrillante, muy parecida a la de una carta real. Al no llevar laminado queda algo más delgada que una carta de verdad.",
	idealPara:
  	"Probar un mazo antes de comprometerte, listas que cambian seguido, o cuando el presupuesto manda.",
	grosor: "Más delgada",
	brillo: "Semibrillo",
	durabilidad: "Básica",
  },
  reforzada300: {
	proceso: [
  	"Impresión sobre papel fotográfico de 300g doble faz, semibrillo.",
  	"Se imprimen dos hojas y se ponen espalda con espalda dentro de una sola lámina de laminado mate.",
  	"El laminado va solo por el dorso: el frente queda con el semibrillo del papel.",
	],
	sensacion:
  	"El laminado del dorso le da firmeza y snap muy parecidos a los de una carta real, y el frente conserva el semibrillo del papel, que ya se parece bastante al de una carta.",
	idealPara:
  	"El mazo que juegas seguido y quieres que se sienta como carta de verdad al barajar.",
	grosor: "Como carta real",
	brillo: "Semibrillo",
	durabilidad: "Alta",
  },
  glossy: {
	proceso: [
  	"Impresión sobre papel fotográfico de 200g.",
  	"Laminado en caliente con pouch brillante, una hoja por pouch.",
	],
	sensacion:
  	"Superficie lisa y brillante, con buen snap al barajar. Es el acabado con más 'pop' de color de todos.",
	idealPara:
  	"Mazos con arte llamativo y quien quiere el máximo brillo. Con fundas, las huellas dejan de ser un tema.",
	grosor: "Como carta real",
	brillo: "Alto",
	durabilidad: "Alta",
  },
  matte: {
	proceso: [
  	"Impresión sobre papel fotográfico de 200g.",
  	"Laminado en caliente con pouch mate, una hoja por pouch.",
	],
	sensacion:
  	"Snap y rigidez muy parecidos a los de una carta real, sin reflejo bajo la luz. Es el que mejor se comporta barajando.",
	idealPara:
  	"Juego frecuente, torneos proxy-friendly y quien prioriza que se sienta como una carta de verdad.",
	grosor: "Como carta real",
	brillo: "Sin reflejo",
	durabilidad: "Alta",
  },
  premium: {
	proceso: [
  	"Impresión sobre papel fotográfico de 200g.",
  	"Por detrás: laminado en caliente con pouch mate, dos hojas por pouch.",
  	"Por delante: laminado en frío mate, hoja por hoja.",
	],
	sensacion:
  	"Acabado mate parejo y la mejor definición de color de todos. Es el que más trabajo lleva: doble proceso de laminado por carta.",
	idealPara:
  	"El mazo que de verdad te importa, cEDH, regalos, o cuando quieres que cada carta se vea impecable.",
	grosor: "Como carta real",
	brillo: "Mate parejo",
	durabilidad: "Máxima",
  },
};

// Fotos de la misma carta en cada acabado. Se cargan desde /public/acabados/
// y la sección aparece sola cuando los archivos existen: así se pueden subir
// sin tocar código, y mientras falten no queda un hueco roto en la página.
const FOTO_MUESTRA = (f: Finish) => `/acabados/${f}.jpg`;
const FOTO_ANGULO = "/acabados/angulo.jpg";

/** Devuelve las rutas que sí cargaron, probándolas en el navegador. */
function useImagenesDisponibles(rutas: string[]): Set<string> {
  const [ok, setOk] = useState<Set<string>>(new Set());

  useEffect(() => {
	let vivo = true;
	Promise.all(
  	rutas.map(
    	(src) =>
      	new Promise<string | null>((resolve) => {
        	const img = new window.Image();
        	img.onload = () => resolve(src);
        	img.onerror = () => resolve(null);
        	img.src = src;
      	})
  	)
	).then((res) => {
  	if (vivo) setOk(new Set(res.filter((x): x is string => x !== null)));
	});
	return () => {
  	vivo = false;
	};
	// rutas es una constante derivada de FINISHES, no cambia en runtime.
	// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ok;
}

const COLUMNAS: Array<{
  icon: typeof Layers;
  label: string;
  get: (f: Finish) => string;
}> = [
  { icon: Layers, label: "Grosor", get: (f) => DETALLE[f].grosor },
  { icon: Sun, label: "Brillo", get: (f) => DETALLE[f].brillo },
  { icon: Shield, label: "Durabilidad", get: (f) => DETALLE[f].durabilidad },
];

export default function AcabadosPage() {
  const router = useRouter();
  const { precios } = usePrecios();

  const disponibles = FINISHES.filter((f) => precios.disponible[f]);

  const fotos = useImagenesDisponibles([
	...FINISHES.map(FOTO_MUESTRA),
	FOTO_ANGULO,
  ]);
  const conMuestra = FINISHES.filter((f) => fotos.has(FOTO_MUESTRA(f)));
  const hayAngulo = fotos.has(FOTO_ANGULO);

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	<section className="px-6 pt-14 pb-10 max-w-5xl mx-auto">
    	<Reveal className="text-center">
      	<Sparkles
        	className="mx-auto text-[#FF4D1A] mb-4 drop-shadow-[0_0_10px_rgba(255,79,26,0.6)]"
        	size={40}
      	/>
      	<h1 className="font-display font-extrabold text-3xl md:text-5xl mb-4">
        	Nuestros <span className="text-lava">acabados</span>
      	</h1>
      	<p className="text-gray-300 max-w-2xl mx-auto">
        	Cada tipo de carta lleva un proceso distinto, y ninguno es
        	&quot;el mejor&quot; para todo: cambian el grosor, el brillo y cuánto
        	trabajo lleva. Acá te contamos exactamente cómo se hace cada una, con
        	lo bueno y lo malo de su proceso.
      	</p>
    	</Reveal>
  	</section>

  	{/* TABLA COMPARATIVA */}
  	<section className="px-6 pb-12 max-w-5xl mx-auto">
    	<Reveal className="glass-card rounded-2xl p-5 md:p-6">
      	<h2 className="font-display font-bold text-lg mb-4">
        	Comparación rápida
      	</h2>
      	<div className="overflow-x-auto">
        	<table className="w-full text-sm border-collapse min-w-[560px]">
          	<thead>
            	<tr className="text-left">
              	<th className="pb-3 pr-4 text-xs uppercase tracking-wide text-gray-400 font-semibold">
                	Acabado
              	</th>
              	{COLUMNAS.map((c) => (
                	<th
                  	key={c.label}
                  	className="pb-3 pr-4 text-xs uppercase tracking-wide text-gray-400 font-semibold"
                	>
                  	<span className="inline-flex items-center gap-1.5">
                    	<c.icon size={13} className="text-[#FF4D1A]" />
                    	{c.label}
                  	</span>
                	</th>
              	))}
              	<th className="pb-3 text-xs uppercase tracking-wide text-gray-400 font-semibold text-right">
                	Por carta
              	</th>
            	</tr>
          	</thead>
          	<tbody>
            	{disponibles.map((f) => {
              	const disponible = true;
              	return (
                	<tr
                  	key={f}
                  	className={
                    	"border-t border-white/10 " +
                    	(disponible ? "" : "opacity-40")
                  	}
                	>
                  	<td className="py-3 pr-4 font-semibold whitespace-nowrap">
                    	{FINISH_INFO[f].label}
                    	{!disponible && (
                      	<span className="block text-[10px] text-gray-400 font-normal">
                        	no disponible
                      	</span>
                    	)}
                  	</td>
                  	{COLUMNAS.map((c) => (
                    	<td key={c.label} className="py-3 pr-4 text-gray-300">
                      	{c.get(f)}
                    	</td>
                  	))}
                  	<td className="py-3 text-right font-display font-bold text-lava whitespace-nowrap">
                    	{formatCLP(precios.unitario[f])}
                  	</td>
                	</tr>
              	);
            	})}
          	</tbody>
        	</table>
      	</div>
      	<p className="text-sm text-gray-300 mt-4">
        	<b className="text-white">Sobre el grosor:</b> los tres acabados
        	laminados quedan prácticamente iguales a una carta real, así que se
        	barajan sin notarse dentro del mazo. La Básica 300g es la única que
        	queda más delgada.
      	</p>
      	{(() => {
        	// Solo los pausados vuelven; los descontinuados no se mencionan.
        	const pausados = FINISHES.filter(
          	(f) => !precios.disponible[f] && !FINISH_INFO[f].descontinuado
        	);
        	if (pausados.length === 0) return null;
        	return (
          	<p className="text-xs text-gray-500 mt-4 border-t border-white/10 pt-3">
            	Temporalmente fuera de catálogo:{" "}
            	{pausados.map((f) => FINISH_INFO[f].label).join(", ")}. Vuelven
            	apenas podamos producirlos con la calidad de siempre.
          	</p>
        	);
      	})()}

      	<p className="text-xs text-gray-500 mt-3">
        	Precios por carta suelta. Armando mazo de 60 o 100 el precio baja
        	automáticamente —{" "}
        	<button
          	onClick={() => router.push("/promos")}
          	className="text-[#FF4D1A] hover:underline"
        	>
          	ver promos
        	</button>
        	.
      	</p>
    	</Reveal>
  	</section>

  	{/* MISMA CARTA EN LOS CUATRO ACABADOS */}
  	{conMuestra.length > 0 && (
    	<section className="px-6 pb-12 max-w-5xl mx-auto">
      	<Reveal className="glass-card rounded-2xl p-5 md:p-8">
        	<h2 className="font-display font-extrabold text-2xl md:text-3xl mb-2 text-center">
          	La <span className="text-lava">misma carta</span> en cada acabado
        	</h2>
        	<p className="text-sm text-gray-400 text-center mb-6 max-w-2xl mx-auto">
          	Misma impresión, misma luz, mismo encuadre. Lo único que cambia es
          	el proceso de acabado.
        	</p>

        	<div
          	className={
            	"grid gap-4 " +
            	(conMuestra.length >= 4
              	? "grid-cols-2 lg:grid-cols-4"
              	: "grid-cols-2")
          	}
        	>
          	{conMuestra.map((f) => (
            	<figure key={f} className="m-0">
              	<div className="relative aspect-[5/7] rounded-xl overflow-hidden ring-1 ring-white/10 bg-[#0b0d11]">
                	<Image
                  	src={FOTO_MUESTRA(f)}
                  	alt={`Carta con acabado ${FINISH_INFO[f].label}`}
                  	fill
                  	sizes="(max-width: 1024px) 50vw, 25vw"
                  	className="object-cover"
                	/>
              	</div>
              	<figcaption className="mt-2 text-center">
                	<span className="block font-display font-bold text-sm">
                  	{FINISH_INFO[f].label}
                	</span>
                	<span className="block text-xs text-gray-400">
                  	{FINISH_INFO[f].contra}
                	</span>
              	</figcaption>
            	</figure>
          	))}
        	</div>

        	{hayAngulo && (
          	<figure className="m-0 mt-8">
            	<div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden ring-1 ring-white/10 bg-[#0b0d11]">
              	<Image
                	src={FOTO_ANGULO}
                	alt="Los cuatro acabados vistos en ángulo, mostrando reflejo y curvatura"
                	fill
                	sizes="(max-width: 1024px) 100vw, 900px"
                	className="object-cover"
              	/>
            	</div>
            	<figcaption className="mt-2 text-xs text-gray-400 text-center">
              	En ángulo se nota lo que de frente no se ve: el reflejo del
              	Glossy y la curvatura leve del Premium.
            	</figcaption>
          	</figure>
        	)}

        	<p className="text-xs text-gray-500 mt-6 text-center">
          	Fotos reales de nuestra producción, sin retoque de color.
        	</p>
      	</Reveal>
    	</section>
  	)}

  	{/* DETALLE POR ACABADO */}
  	<section className="px-6 pb-12 max-w-5xl mx-auto space-y-6">
    	{disponibles.map((f, idx) => {
      	const info = FINISH_INFO[f];
      	const det = DETALLE[f];
      	const disponible = precios.disponible[f];

      	return (
        	<Reveal
          	key={f}
          	delay={idx * 0.05}
          	className={
            	"glass-card rounded-2xl p-6 md:p-8 " +
            	(disponible ? "" : "opacity-60")
          	}
        	>
          	<div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            	<div>
              	<h2 className="font-display font-extrabold text-2xl md:text-3xl">
                	{info.label}
              	</h2>
              	<p className="text-sm text-gray-400 mt-1">{info.desc}</p>
            	</div>
            	<div className="text-right">
              	<p className="font-display font-extrabold text-2xl text-lava">
                	{formatCLP(precios.unitario[f])}
              	</p>
              	<p className="text-xs text-gray-500">por carta</p>
              	{!disponible && (
                	<p className="text-xs text-yellow-400 mt-1">
                  	No disponible por ahora
                	</p>
              	)}
            	</div>
          	</div>

          	<div className="grid md:grid-cols-2 gap-6">
            	<div>
              	<h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">
                	Cómo se hace
              	</h3>
              	<ol className="space-y-2">
                	{det.proceso.map((paso, i) => (
                  	<li
                    	key={i}
                    	className="flex gap-3 text-sm text-gray-300"
                  	>
                    	<span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#FF4D1A]/15 text-[#FF4D1A] text-[11px] font-bold flex items-center justify-center mt-0.5">
                      	{i + 1}
                    	</span>
                    	{paso}
                  	</li>
                	))}
              	</ol>

              	<h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mt-5 mb-2 flex items-center gap-1.5">
                	<Hand size={13} className="text-[#FF4D1A]" /> Cómo se siente
              	</h3>
              	<p className="text-sm text-gray-300">{det.sensacion}</p>
            	</div>

            	<div className="space-y-3">
              	<div className="bg-[#0b0d11]/60 p-4 rounded-xl border border-green-500/20">
                	<p className="text-sm text-green-300 flex gap-2">
                  	<Check size={16} className="flex-shrink-0 mt-0.5" />
                  	<span>{info.pro}</span>
                	</p>
              	</div>
              	<div className="bg-[#0b0d11]/60 p-4 rounded-xl border border-yellow-500/20">
                	<p className="text-sm text-yellow-300 flex gap-2">
                  	<AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  	<span>{info.contra}</span>
                	</p>
              	</div>
              	<div className="bg-[#0b0d11]/60 p-4 rounded-xl border border-white/10">
                	<h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1.5 flex items-center gap-1.5">
                  	<Wallet size={13} className="text-[#FF4D1A]" /> Ideal para
                	</h3>
                	<p className="text-sm text-gray-300">{det.idealPara}</p>
              	</div>
            	</div>
          	</div>
        	</Reveal>
      	);
    	})}
  	</section>

  	{/* AYUDA PARA ELEGIR */}
  	<section className="px-6 pb-12 max-w-4xl mx-auto">
    	<Reveal className="glass-card rounded-2xl p-6 md:p-8">
      	<h2 className="font-display font-extrabold text-2xl mb-5 text-center">
        	¿Cuál <span className="text-lava">elijo</span>?
      	</h2>
      	<div className="space-y-3 text-sm">
        	{[
          	{
            	si: "Quiero gastar lo menos posible o estoy probando el mazo",
            	elige: "base300" as Finish,
          	},
          	{
            	si: "Quiero que se sienta como una carta real al barajar",
            	elige: "reforzada300" as Finish,
          	},
          	{
            	si: "Quiero que los colores se vean lo más vivos posible",
            	elige: "glossy" as Finish,
          	},
          	{
            	si: "Quiero que se sienta como una carta real al barajar",
            	elige: "matte" as Finish,
          	},
          	{
            	si: "Es mi mazo principal y quiero lo mejor que hacemos",
            	elige: "premium" as Finish,
          	},
        	]
          	.filter(({ elige }) => precios.disponible[elige])
          	.map(({ si, elige }) => (
          	<div
            	key={elige}
            	className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 pb-3 last:border-0"
          	>
            	<span className="text-gray-300 flex-1 min-w-[240px]">{si}</span>
            	<span className="font-display font-bold text-lava whitespace-nowrap">
              	→ {FINISH_INFO[elige].label}
            	</span>
          	</div>
        	))}
      	</div>

      	<p className="text-xs text-gray-400 mt-5 text-center">
        	Puedes mezclar acabados en un mismo pedido. Eso sí, las promos de 60 y
        	100 cartas piden que todas lleven el mismo.
      	</p>
    	</Reveal>
  	</section>

  	{/* NOTA HONESTA */}
  	<section className="px-6 pb-12 max-w-4xl mx-auto">
    	<Reveal className="glass-card rounded-2xl p-6 md:p-8">
      	<h2 className="font-display font-bold text-xl mb-3">
        	Lo mismo en los cuatro
      	</h2>
      	<ul className="space-y-2 text-sm text-gray-300">
        	<li>
          	• Todas son <b className="text-white">proxies artesanales</b> hechas
          	a mano en Pucón. No buscan pasar por cartas oficiales.
        	</li>
        	<li>
          	• El <b className="text-white">reverso es blanco liso</b> en las
          	cartas de una cara, salvo que subas un{" "}
          	<b className="text-white">dorso personalizado</b> desde el carrito.
          	Las <b className="text-white">MDFC</b> llevan su reverso real
          	impreso sin costo extra.
        	</li>
        	<li>
          	• Pedido mínimo de <b className="text-white">9 cartas</b> (una hoja
          	completa), en cualquier acabado.
        	</li>
        	<li>
          	• Son para playtest, casual, EDH/cEDH y torneos proxy-friendly. No
          	para torneos sancionados.
        	</li>
      	</ul>
    	</Reveal>
  	</section>

  	<section className="px-6 pb-20 text-center">
    	<Reveal>
      	<p className="text-gray-300 mb-5">
        	{disponibles.length === FINISHES.length
          	? "Los cuatro acabados están disponibles ahora."
          	: `Disponibles ahora: ${disponibles
              	.map((f) => FINISH_INFO[f].label)
              	.join(", ")}.`}
      	</p>
      	<div className="flex flex-col sm:flex-row gap-3 justify-center">
        	<button
          	onClick={() => router.push("/catalogo")}
          	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-7 py-3.5 rounded-lg font-semibold shadow-[0_10px_30px_-10px_rgba(255,79,26,0.6)] transition-all"
        	>
          	Explorar catálogo
        	</button>
        	<button
          	onClick={() => router.push("/importar")}
          	className="glass-card hover:border-[#FF4D1A]/40 px-7 py-3.5 rounded-lg font-semibold transition-colors"
        	>
          	Importar mi mazo
        	</button>
      	</div>
    	</Reveal>
  	</section>

  	<Footer />
	</main>
  );
}
