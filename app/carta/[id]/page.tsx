"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ShoppingCart, ChevronDown } from "lucide-react";
import NavBar from "@/components/NavBar";
import ManaSymbols from "@/components/ManaSymbols";
import Reveal from "@/components/animation/Reveal";
import {
  catalogo as catalogoDeJuego,
  etiquetaDeIdioma,
  parseUid,
  type CampoFicha,
  type CartaCatalogo,
  type Ruling,
} from "@/lib/catalogo";
import { ficha as pedirFicha } from "@/lib/catalogo/cliente";
import {
  defaultFinish,
  finishDisponible,
  formatCLP,
  precioUnitario,
  type Finish,
} from "@/lib/pricing";
import { usePrecios } from "@/hooks/usePrecios";
import FinishButtons from "@/components/FinishButtons";
import { addToCart as addItemToCart } from "@/lib/cart";
import type { MpcCard } from "@/app/api/mpcfill/route";

/**
 * El uid tal como viaja en la URL.
 *
 * `useParams` de Next devuelve el segmento crudo, todavía codificado, así que
 * el ":" del uid llega como "%3A"; sin decodificarlo se vuelve a codificar al
 * armar la consulta ("%253A") y la carta nunca se encuentra. Un id viejo de
 * Scryfall pelado pasa por acá sin cambios.
 */
function uidDeLaUrl(raw: string): string {
  try {
	return decodeURIComponent(raw);
  } catch {
	return raw;
  }
}

/** Una fila de la ficha: el catálogo decidió el rótulo y cómo se pinta. */
function Campo({ campo }: { campo: CampoFicha }) {
  return (
	<p className="mb-2 flex items-center gap-2 flex-wrap">
  	<span className="text-gray-400 text-sm">{campo.label}:</span>
  	{campo.render === "mana" ? (
    	<ManaSymbols text={campo.value} size={20} />
  	) : (
    	<span>{campo.value}</span>
  	)}
	</p>
  );
}

export default function CartaDetalle() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const uid = uidDeLaUrl(params.id || "");
  const { precios } = usePrecios();
  const [card, setCard] = useState<CartaCatalogo | null>(null);
  const [prints, setPrints] = useState<CartaCatalogo[]>([]);
  const [selectedPrint, setSelectedPrint] = useState<CartaCatalogo | null>(null);
  const [finish, setFinish] = useState<Finish>("glossy");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rulings, setRulings] = useState<Ruling[]>([]);
  const [showRulings, setShowRulings] = useState(false);
  const [mpcCards, setMpcCards] = useState<MpcCard[]>([]);
  const [mpcLoading, setMpcLoading] = useState(false);
  const [mpcSearched, setMpcSearched] = useState(false);
  const [mpcError, setMpcError] = useState("");
  const [mpcSelected, setMpcSelected] = useState<MpcCard | null>(null);

  // El uid dice de qué juego es la carta, incluso antes de que llegue.
  const catalogo = catalogoDeJuego(parseUid(uid).juego);

  // Si el acabado elegido se desactiva desde el admin, saltar al disponible.
  useEffect(() => {
	if (!finishDisponible(precios, finish)) {
  	setFinish(defaultFinish(precios));
	}
  }, [precios, finish]);

  useEffect(() => {
	(async () => {
  	if (!uid) return;
  	const f = await pedirFicha(uid);
  	setCard(f?.carta ?? null);
  	setSelectedPrint(f?.carta ?? null);
  	setPrints(f?.versiones ?? []);
  	setRulings(f?.rulings ?? []);
  	setLoading(false);
	})();
  }, [uid]);

  const buscarMpc = async () => {
	if (!card) return;
	setMpcLoading(true);
	setMpcError("");
	try {
  	const nombre = card.name.split(" // ")[0];
  	const res = await fetch("/api/mpcfill?q=" + encodeURIComponent(nombre));
  	const data = await res.json();
  	if (!res.ok) throw new Error(data.error || "Error al buscar en MPCFill");
  	setMpcCards(data.cards || []);
	} catch (err: unknown) {
  	setMpcError(err instanceof Error ? err.message : "Error al buscar");
	} finally {
  	setMpcLoading(false);
  	setMpcSearched(true);
	}
  };

  const addToCart = () => {
	if (!selectedPrint) return;
	if (mpcSelected) {
  	// Arte HD de MPCFill: id propio para que no se mezcle con la versión
  	// del catálogo de la misma carta en el carrito.
  	addItemToCart({
    	id: `${selectedPrint.uid}-mpc-${mpcSelected.id}`,
    	juego: selectedPrint.juego,
    	idioma: selectedPrint.idioma,
    	name: selectedPrint.name,
    	set: selectedPrint.set,
    	set_name: `MPCFill HD · ${mpcSelected.name}`,
    	collector_number: selectedPrint.collector_number,
    	image: mpcSelected.thumb,
    	finish,
    	quantity: qty,
    	mpcfillId: mpcSelected.id,
  	});
  	return;
	}
	addItemToCart({
  	id: selectedPrint.uid,
  	juego: selectedPrint.juego,
  	idioma: selectedPrint.idioma,
  	name: selectedPrint.name,
  	set: selectedPrint.set,
  	set_name: selectedPrint.set_name,
  	collector_number: selectedPrint.collector_number,
  	image: selectedPrint.imagenes.small,
  	finish,
  	quantity: qty,
	});
  };

  if (loading) {
	return (
  	<main className="min-h-screen bg-[#0b0d11] text-white">
    	<NavBar />
    	<div className="flex items-center justify-center py-32">
      	<Loader2 className="animate-spin text-[#FF4D1A]" size={40} />
    	</div>
  	</main>
	);
  }

  if (!card) {
	return (
  	<main className="min-h-screen bg-[#0b0d11] text-white">
    	<NavBar />
    	<p className="text-center py-32">Carta no encontrada.</p>
  	</main>
	);
  }

  const display = selectedPrint || card;
  const unitPrice = precioUnitario(precios, finish);
  const mainImg = mpcSelected ? mpcSelected.thumb : display.imagenes.large;

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	<div className="max-w-6xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/catalogo")}
      	className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al catálogo
    	</button>

    	<Reveal className="grid grid-cols-1 md:grid-cols-2 gap-10">
      	{/* Una carta apaisada en marco vertical se recorta hasta no verse. */}
      	<div
        	role="img"
        	aria-label={display.name}
        	className={
          	"relative rounded-xl overflow-hidden bg-[#12151b] ring-1 ring-white/10 bg-center bg-cover bg-no-repeat " +
          	(display.apaisada ? "aspect-[7/5]" : "aspect-[5/7]")
        	}
        	style={{ backgroundImage: `url(${mainImg})` }}
      	/>

      	<div>
        	<h1 className="font-display font-extrabold text-3xl mb-1">{display.name}</h1>
        	<p className="text-sm text-gray-400 mb-4">
          	{display.set_name} · #{display.collector_number} ·{" "}
          	{etiquetaDeIdioma(display.idioma)}
          	{display.rarity ? (
            	<>
              	{" · "}
              	<span className="capitalize">{display.rarity}</span>
            	</>
          	) : null}
        	</p>

        	{display.ficha.map((campo) => (
          	<Campo key={campo.label} campo={campo} />
        	))}
        	{display.texto ? (
          	<div className="mb-4 text-sm glass-card p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
            	{display.texto.render === "mana" ? (
              	<ManaSymbols text={display.texto.value} size={14} />
            	) : (
              	display.texto.value
            	)}
          	</div>
        	) : null}

        	{/* Rulings: hoy solo Magic los publica. */}
        	{catalogo.rulings ? (
          	<div className="mb-4">
            	<button
              	onClick={() => rulings.length > 0 && setShowRulings((v) => !v)}
              	disabled={rulings.length === 0}
              	className={
                	"flex items-center gap-2 text-sm font-semibold transition " +
                	(rulings.length > 0
                  	? "text-gray-300 hover:text-white cursor-pointer"
                  	: "text-gray-500 cursor-default")
              	}
            	>
              	{rulings.length > 0 ? (
                	<ChevronDown
                  	size={16}
                  	className={
                    	"transition-transform " + (showRulings ? "rotate-180" : "")
                  	}
                	/>
              	) : null}
              	{rulings.length > 0
                	? `Rulings (${rulings.length})`
                	: "Sin rulings publicados para esta carta"}
            	</button>
            	{showRulings && rulings.length > 0 ? (
              	<div className="mt-2 space-y-3 text-sm glass-card p-3 rounded-lg max-h-72 overflow-y-auto">
                	{rulings.map((r, idx) => (
                  	<div
                    	key={idx}
                    	className="border-b border-white/10 pb-2 last:border-0 last:pb-0"
                  	>
                    	<p className="text-xs text-gray-500 mb-1">{r.fecha}</p>
                    	<p className="text-gray-300 leading-relaxed">{r.texto}</p>
                  	</div>
                	))}
              	</div>
            	) : null}
          	</div>
        	) : null}

        	{display.artist ? (
          	<p className="mb-6 text-sm text-gray-400">
            	Ilustrador: {display.artist}
          	</p>
        	) : null}

        	{prints.length > 1 ? (
          	<div className="mb-6">
            	<p className="text-sm font-semibold mb-2">
              	Elige el arte ({prints.length} versiones)
            	</p>
            	<div className="flex gap-2 overflow-x-auto pb-2">
              	{prints.map((p) => {
                	const isSel = selectedPrint?.uid === p.uid;
                	const btnClass =
                  	"relative flex-shrink-0 w-20 rounded border-2 overflow-hidden transition bg-center bg-cover bg-no-repeat " +
                  	(p.apaisada ? "aspect-[7/5] " : "aspect-[5/7] ") +
                  	(isSel
                    	? "border-[#FF4D1A]"
                    	: "border-white/10 hover:border-white/30");
                	return (
                  	<button
                    	key={p.uid}
                    	onClick={() => {
                      	setSelectedPrint(p);
                      	setMpcSelected(null);
                    	}}
                    	aria-label={p.name}
                    	className={btnClass}
                    	style={{ backgroundImage: `url(${p.imagenes.small})` }}
                  	/>
                	);
              	})}
            	</div>
          	</div>
        	) : null}

        	{/* ARTES HD DE MPCFILL */}
        	{catalogo.soportaMpcfill ? (
          	<div className="mb-6">
            	{!mpcSearched && !mpcLoading ? (
              	<button
                	onClick={buscarMpc}
                	className="w-full glass-card hover:border-[#FF4D1A]/50 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              	>
                	✨ Buscar artes HD en MPCFill
              	</button>
            	) : null}
            	{mpcLoading ? (
              	<div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                	<Loader2 className="animate-spin text-[#FF4D1A]" size={16} />
                	Buscando en MPCFill...
              	</div>
            	) : null}
            	{mpcError ? (
              	<p className="text-sm text-red-400 py-2">{mpcError}</p>
            	) : null}
            	{mpcSearched && !mpcLoading && mpcCards.length === 0 && !mpcError ? (
              	<p className="text-sm text-gray-500 py-2">
                	No hay versiones de esta carta en MPCFill — el arte de
                	Scryfall se ve excelente igual.
              	</p>
            	) : null}
            	{mpcCards.length > 0 ? (
              	<>
                	<p className="text-sm font-semibold mb-1">
                  	Artes HD de MPCFill ({mpcCards.length})
                	</p>
                	<p className="text-xs text-gray-500 mb-2">
                  	Réplicas digitales en alta resolución — mayor nitidez de
                  	impresión que los escaneos de Scryfall (la diferencia es
                  	sutil, pero existe).
                	</p>
                	<div className="flex gap-2 overflow-x-auto pb-2">
                  	{mpcCards.map((m) => {
                    	const isSel = mpcSelected?.id === m.id;
                    	return (
                      	<button
                        	key={m.id}
                        	onClick={() => setMpcSelected(isSel ? null : m)}
                        	aria-label={m.name}
                        	title={`${m.name} · ${m.dpi} DPI · ${m.language}`}
                        	className={
                          	"relative flex-shrink-0 w-20 rounded border-2 overflow-hidden transition " +
                          	(isSel
                            	? "border-[#FF4D1A]"
                            	: "border-white/10 hover:border-white/30")
                        	}
                      	>
                        	{/* eslint-disable-next-line @next/next/no-img-element */}
                        	<img
                          	src={m.thumb}
                          	alt={m.name}
                          	loading="lazy"
                          	className="w-full aspect-[5/7] object-cover"
                        	/>
                        	<span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-center py-0.5">
                          	{m.dpi} DPI · {m.language}
                        	</span>
                      	</button>
                    	);
                  	})}
                	</div>
                	{mpcSelected ? (
                  	<p className="text-xs text-[#FF4D1A] mt-1">
                    	Arte HD seleccionado: {mpcSelected.name} (
                    	{mpcSelected.dpi} DPI)
                  	</p>
                	) : null}
              	</>
            	) : null}
          	</div>
        	) : null}

        	<div className="glass-card p-5 rounded-xl">
          	<p className="text-sm font-semibold mb-3">Acabado</p>
          	<div className="mb-4">
            	<FinishButtons
              	precios={precios}
              	value={finish}
              	onChange={setFinish}
            	/>
          	</div>

          	<p className="text-sm font-semibold mb-2">Cantidad</p>
          	<input
            	type="number"
            	min={1}
            	max={20}
            	value={qty}
            	onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 mb-4"
          	/>

          	<div className="flex justify-between items-center mb-4">
            	<span className="text-gray-400">Subtotal</span>
            	<span className="text-2xl font-display font-bold text-lava">
              	{formatCLP(unitPrice * qty)}
            	</span>
          	</div>

          	<button
            	onClick={addToCart}
            	className="w-full bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-[0_4px_20px_-4px_rgba(255,79,26,0.6)] transition-all"
          	>
            	<ShoppingCart size={18} /> Agregar al carrito
          	</button>
          	<p className="text-xs text-gray-400 text-center mt-2">
            	Tip: el carrito en la barra superior se actualiza al instante.
          	</p>
        	</div>
      	</div>
    	</Reveal>
  	</div>
	</main>
  );
}
