"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Upload,
  CheckCircle2,
  ShoppingCart,
  FileText,
  AlertTriangle,
} from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";
import {
  parseDeck,
  resolveDeck,
  type ImportedCard,
} from "@/lib/deckParser";
import {
  catalogo as catalogoDeJuego,
  etiquetaDeIdioma,
  IDIOMA_BASE,
  type CartaCatalogo,
  type IdiomaId,
} from "@/lib/catalogo";
import { versiones } from "@/lib/catalogo/cliente";
import { addToCart } from "@/lib/cart";
import {
  defaultFinish,
  finishDisponible,
  formatCLP,
  precioUnitario,
  type Finish,
} from "@/lib/pricing";
import FinishButtons from "@/components/FinishButtons";
import { usePrecios } from "@/hooks/usePrecios";

type CardWithFinish = ImportedCard & { finish?: Finish };

const EXAMPLE = `1 Lightning Bolt (M11) 149
1 Sol Ring (CMR) 410
1 Counterspell
4 Forest`;

export default function ImportarPage() {
  const router = useRouter();
  const { precios } = usePrecios();
  const [text, setText] = useState("");
  const [globalFinish, setGlobalFinish] = useState<Finish>("glossy");
  const [idioma, setIdioma] = useState<IdiomaId>(IDIOMA_BASE);
  const [includeSideboard, setIncludeSideboard] = useState(true);
  const [cards, setCards] = useState<CardWithFinish[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [printPickerIdx, setPrintPickerIdx] = useState<number | null>(null);
  // Las versiones ya cargadas, por grupo de carta (todas las impresiones de
  // la misma). Se cachean acá para no volver a pedirlas al reabrir el selector.
  const [printsByOracle, setPrintsByOracle] = useState<
	Record<string, CartaCatalogo[]>
  >({});
  const [loadingPrints, setLoadingPrints] = useState(false);

  // Si un acabado se desactiva desde el admin, corregir el global y limpiar
  // los overrides por carta que quedaron apuntando al acabado bloqueado.
  useEffect(() => {
	if (!finishDisponible(precios, globalFinish)) {
  	setGlobalFinish(defaultFinish(precios));
	}
	setCards((prev) =>
  	prev.some((c) => c.finish && !finishDisponible(precios, c.finish))
    	? prev.map((c) =>
        	c.finish && !finishDisponible(precios, c.finish)
          	? { ...c, finish: undefined }
          	: c
      	)
    	: prev
	);
  }, [precios, globalFinish]);

  const openPrintPicker = async (idx: number, carta: CartaCatalogo) => {
	setPrintPickerIdx(idx);
	if (printsByOracle[carta.grupoId]) return;
	setLoadingPrints(true);
	const prints = await versiones(carta.uid);
	setPrintsByOracle((prev) => ({ ...prev, [carta.grupoId]: prints }));
	setLoadingPrints(false);
  };

  const chooseArt = (idx: number, print: CartaCatalogo) => {
	setCards((prev) => {
  	const next = [...prev];
  	next[idx] = { ...next[idx], card: print };
  	return next;
	});
	setPrintPickerIdx(null);
  };

  const handleAnalyze = async () => {
	const parsed = parseDeck(text);
	if (parsed.length === 0) {
  	alert("No se detectaron cartas válidas. Revisa el formato.");
  	return;
	}
	setLoading(true);
	setProgress({ done: 0, total: parsed.length });
	setCards([]);
	const resolved = await resolveDeck(
  	parsed,
  	(done, total) => setProgress({ done, total }),
  	idioma
	);
	setCards(resolved);
	setLoading(false);
  };

  const updateCardFinish = (idx: number, finish: Finish) => {
	setCards((prev) => {
  	const next = [...prev];
  	next[idx] = { ...next[idx], finish };
  	return next;
	});
  };

  const getFinish = (c: CardWithFinish): Finish => c.finish || globalFinish;

  const addAllToCart = () => {
	const eligible = cards.filter(
  	(c) =>
    	c.status === "ok" &&
    	c.card &&
    	(includeSideboard || !c.isSideboard)
	);
	if (eligible.length === 0) {
  	alert("No hay cartas válidas para agregar");
  	return;
	}
	eligible.forEach((c) => {
  	if (!c.card) return;
  	addToCart({
    	id: c.card.uid,
    	juego: c.card.juego,
    	idioma: c.card.idioma,
    	name: c.card.name,
    	set: c.card.set,
    	set_name: c.card.set_name,
    	collector_number: c.card.collector_number,
    	image: c.card.imagenes.normal,
    	finish: getFinish(c),
    	quantity: c.quantity,
  	});
	});
	router.push("/carrito");
  };

  const okCards = cards.filter((c) => c.status === "ok");
  // Las que no se pudieron traer en el idioma pedido, para decirlo una vez
  // arriba en vez de obligar a contar las etiquetas amarillas.
  const sinTraducir = okCards.filter(
	(c) => c.card && c.card.idioma !== idioma
  ).length;
  const notFoundCards = cards.filter((c) => c.status === "not_found");
  const totalOk = okCards.reduce((s, c) => s + c.quantity, 0);
  const estimateTotal = okCards.reduce((s, c) => {
	const finish = getFinish(c);
	const unit = precioUnitario(precios, finish);
	return s + unit * c.quantity;
  }, 0);

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	<section className="px-6 py-10 max-w-5xl mx-auto">
    	<Reveal className="mb-8">
      	<FileText className="text-[#FF4D1A] mb-3 drop-shadow-[0_0_10px_rgba(255,79,26,0.6)]" size={40} />
      	<h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2 break-words">
        	Importar lista{" "}
        	<span className="text-lava">MTGO/Moxfield/Archidekt</span>
      	</h1>
      	<p className="text-gray-400">
        	Pega tu lista de mazo y armamos tu pedido en segundos.
      	</p>
    	</Reveal>

    	<div className="grid lg:grid-cols-3 gap-6 mb-6">
      	<div className="lg:col-span-2">
        	<label className="block text-sm font-semibold mb-2">Tu lista</label>
        	<textarea
          	value={text}
          	onChange={(e) => setText(e.target.value)}
          	placeholder={EXAMPLE}
          	className="w-full glass-card rounded-lg p-4 text-sm font-mono min-h-[280px] focus:outline-none focus:border-[#FF4D1A]/60"
        	/>
        	<p className="text-xs text-gray-500 mt-2">
          	Acepta <code>1 Carta</code>, <code>1 Carta (SET)</code>,{" "}
          	<code>1 Carta (SET) 123</code>.
        	</p>
      	</div>

      	<div className="glass-card p-5 rounded-xl h-fit">
        	<h3 className="font-bold mb-3">Configuración</h3>

        	<label className="block text-xs text-gray-400 mb-1">
          	Acabado por defecto
        	</label>
        	<div className="mb-4">
          	<FinishButtons
            	precios={precios}
            	value={globalFinish}
            	onChange={setGlobalFinish}
          	/>
        	</div>

        	{/* Las listas de Moxfield y Archidekt vienen en inglés, así que
            	el idioma se aplica a la impresión ya encontrada. Solo los que
            	Scryfall entrega de verdad. */}
        	<label className="block text-xs text-gray-400 mb-1">
          	Idioma de las cartas
        	</label>
        	<div className="flex gap-1.5 flex-wrap mb-2">
          	{catalogoDeJuego("mtg").idiomas.map((id) => (
            	<button
              	key={id}
              	type="button"
              	onClick={() => setIdioma(id)}
              	className={
                	"px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border " +
                	(id === idioma
                  	? "bg-white/10 border-white/40 text-white"
                  	: "border-white/10 text-gray-400 hover:border-white/30")
              	}
            	>
              	{etiquetaDeIdioma(id)}
            	</button>
          	))}
        	</div>
        	<p className="text-xs text-gray-500 mb-4">
          	Pega la lista en inglés igual: la carta que no exista en el idioma
          	elegido — o que solo tenga una imagen sin escanear — se queda en
          	inglés, y abajo verás cuál es cuál.
        	</p>

        	<label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
          	<input
            	type="checkbox"
            	checked={includeSideboard}
            	onChange={(e) => setIncludeSideboard(e.target.checked)}
            	className="accent-[#FF4D1A]"
          	/>
          	Incluir sideboard (SB:)
        	</label>

        	<button
          	onClick={handleAnalyze}
          	disabled={loading || !text.trim()}
          	className="w-full bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-[0_4px_20px_-4px_rgba(255,79,26,0.5)] transition-all disabled:opacity-50 disabled:shadow-none"
        	>
          	{loading ? (
            	<>
              	<Loader2 className="animate-spin" size={16} /> Analizando...
            	</>
          	) : (
            	<>
              	<Upload size={16} /> Analizar lista
            	</>
          	)}
        	</button>
      	</div>
    	</div>

    	{loading && progress.total > 0 && (
      	<div className="glass-card p-4 rounded-xl mb-6">
        	<div className="flex items-center justify-between mb-2 text-sm">
          	<span className="text-gray-400">Buscando en Scryfall...</span>
          	<span className="text-[#FF4D1A] font-semibold">
            	{progress.done} / {progress.total}
          	</span>
        	</div>
        	<div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          	<div
            	className="bg-[#FF4D1A] h-full transition-all"
            	style={{
              	width: (progress.done / progress.total) * 100 + "%",
            	}}
          	/>
        	</div>
      	</div>
    	)}

    	{!loading && cards.length > 0 && (
      	<>
        	<div className="grid sm:grid-cols-3 gap-3 mb-6">
          	<div className="glass-card p-4 rounded-xl">
            	<p className="text-xs text-gray-400 uppercase">Encontradas</p>
            	<p className="text-2xl font-bold text-green-400 mt-1">
              	{okCards.length}{" "}
              	<span className="text-sm text-gray-400">
                	({totalOk} cartas)
              	</span>
            	</p>
          	</div>
          	<div className="glass-card p-4 rounded-xl">
            	<p className="text-xs text-gray-400 uppercase">No encontradas</p>
            	<p className="text-2xl font-bold text-red-400 mt-1">
              	{notFoundCards.length}
            	</p>
          	</div>
          	<div className="glass-card p-4 rounded-xl">
            	<p className="text-xs text-gray-400 uppercase">
              	Total estimado
            	</p>
            	<p className="text-2xl font-display font-bold text-lava mt-1">
              	{formatCLP(estimateTotal)}
            	</p>
          	</div>
        	</div>

        	{notFoundCards.length > 0 && (
          	<div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl mb-6">
            	<p className="font-semibold text-yellow-300 flex items-center gap-2 mb-2">
              	<AlertTriangle size={16} /> Cartas no encontradas
            	</p>
            	<ul className="text-sm text-yellow-200/80 space-y-1">
              	{notFoundCards.map((c, idx) => (
                	<li key={idx}>
                  	• {c.raw}{" "}
                  	<span className="text-xs">({c.errorMsg})</span>
                	</li>
              	))}
            	</ul>
            	<p className="text-xs text-yellow-300 mt-3">
              	Tip: revisa la escritura del nombre. También puedes subirlas
              	como cartas custom si tienes la imagen.
            	</p>
          	</div>
        	)}

        	<h2 className="font-bold text-lg mb-1">
          	Cartas detectadas ({okCards.length})
        	</h2>
        	{sinTraducir > 0 ? (
          	<p className="text-xs text-yellow-300/90 mb-3">
            	{sinTraducir} de {okCards.length} no existe en{" "}
            	{etiquetaDeIdioma(idioma)} con una imagen imprimible, así que va
            	en inglés. Están marcadas abajo.
          	</p>
        	) : (
          	<div className="mb-3" />
        	)}
        	<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          	{cards.map((c, idx) => {
            	if (c.status !== "ok" || !c.card) return null;
            	const cardFinish = getFinish(c);
            	const imgSrc = c.card.imagenes.normal;
            	return (
              	<div
                	key={idx}
                	className="glass-card rounded-lg overflow-hidden"
              	>
                	<div
                  	role="img"
                  	aria-label={c.card.name}
                  	className="aspect-[5/7] bg-[#0b0d11] bg-center bg-cover bg-no-repeat"
                  	style={{ backgroundImage: "url(" + imgSrc + ")" }}
                	/>
                	<div className="p-2">
                  	<div className="flex items-start justify-between gap-1 mb-1">
                    	<p className="text-xs font-semibold truncate flex-1">
                      	{c.quantity}× {c.card.name}
                    	</p>
                    	<CheckCircle2
                      	size={12}
                      	className="text-green-400 flex-shrink-0 mt-0.5"
                    	/>
                  	</div>
                  	<p className="text-[10px] text-gray-400 truncate">
                    	{c.card.set_name}
                  	</p>
                  	{/* Solo cuando NO salió en el idioma pedido: decirlo en
                      	todas sería ruido, y callarlo sería la sorpresa que
                      	llega en el sobre. */}
                  	{c.card.idioma !== idioma ? (
                    	<p className="text-[10px] text-yellow-300/90 truncate">
                      	Solo en {etiquetaDeIdioma(c.card.idioma)}
                    	</p>
                  	) : null}
                  	<div className="mt-2">
                    	<FinishButtons
                      	precios={precios}
                      	value={cardFinish}
                      	onChange={(f) => updateCardFinish(idx, f)}
                      	size="xs"
                    	/>
                  	</div>
                  	<button
                    	onClick={() =>
                      	printPickerIdx === idx
                        	? setPrintPickerIdx(null)
                        	: openPrintPicker(idx, c.card!)
                    	}
                    	className="w-full mt-1 py-1 text-[10px] rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition"
                  	>
                    	{printPickerIdx === idx
                      	? "Cerrar"
                      	: "🎨 Cambiar arte"}
                  	</button>
                  	{printPickerIdx === idx ? (
                    	<div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                      	{loadingPrints && !printsByOracle[c.card.grupoId] ? (
                        	<Loader2
                          	className="animate-spin text-[#FF4D1A] mx-auto my-2"
                          	size={16}
                        	/>
                      	) : (
                        	(printsByOracle[c.card.grupoId] || []).map(
                          	(p) => (
                            	<button
                              	key={p.uid}
                              	onClick={() => chooseArt(idx, p)}
                              	aria-label={p.set_name}
                              	className={
                                	"relative flex-shrink-0 w-10 aspect-[5/7] rounded border overflow-hidden bg-center bg-cover bg-no-repeat transition " +
                                	(p.uid === c.card!.uid
                                  	? "border-[#FF4D1A]"
                                  	: "border-white/10 hover:border-white/30")
                              	}
                              	style={{
                                	backgroundImage: `url(${p.imagenes.small})`,
                              	}}
                            	/>
                          	)
                        	)
                      	)}
                    	</div>
                  	) : null}
                  	{c.isSideboard && (
                    	<p className="text-[9px] text-yellow-400 mt-1">
                      	SIDEBOARD
                    	</p>
                  	)}
                	</div>
              	</div>
            	);
          	})}
        	</div>

        	<div className="glass-card p-5 rounded-xl flex flex-wrap items-center justify-between gap-4 sticky bottom-4">
          	<div>
            	<p className="text-xs text-gray-400">Estimado total</p>
            	<p className="text-2xl font-display font-bold text-lava">
              	{formatCLP(estimateTotal)}
            	</p>
            	<p className="text-xs text-gray-500">
              	{totalOk} cartas · promo aplica si llegas a 60 o 100
            	</p>
          	</div>
          	<button
            	onClick={addAllToCart}
            	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-[0_4px_20px_-4px_rgba(255,79,26,0.5)] transition-all"
          	>
            	<ShoppingCart size={18} /> Agregar todo al carrito
          	</button>
        	</div>
      	</>
    	)}

    	{!loading && cards.length === 0 && (
      	<div className="glass-card p-6 rounded-xl">
        	<h3 className="font-bold mb-3">📖 Cómo exportar tu lista</h3>
        	<div className="grid md:grid-cols-3 gap-4 text-sm">
          	<div>
            	<p className="font-semibold text-[#FF4D1A] mb-1">Moxfield</p>
            	<p className="text-gray-400 text-xs">
              	Tu mazo → More → Export → MTGO format → Copy → pégalo aquí.
            	</p>
          	</div>
          	<div>
            	<p className="font-semibold text-[#FF4D1A] mb-1">Archidekt</p>
            	<p className="text-gray-400 text-xs">
              	Tu mazo → Export → MTGO/Plain Text → Copy → pégalo aquí.
            	</p>
          	</div>
          	<div>
            	<p className="font-semibold text-[#FF4D1A] mb-1">MTGO/Arena</p>
            	<p className="text-gray-400 text-xs">
              	Export decklist → guardar como .txt → abrir y copiar → pégalo
              	aquí.
            	</p>
          	</div>
        	</div>
      	</div>
    	)}
  	</section>

  	<Footer />
	</main>
  );
}

