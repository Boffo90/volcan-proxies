"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search, Loader2, Shuffle, Plus, Minus, Check } from "lucide-react";
import NavBar from "@/components/NavBar";
import Reveal from "@/components/animation/Reveal";
import {
  CATALOGOS,
  catalogo as catalogoDeJuego,
  etiquetaDeIdioma,
  IDIOMA_BASE,
  JUEGO_DEFAULT,
  type CartaCatalogo,
  type IdiomaId,
  type JuegoId,
} from "@/lib/catalogo";
import { aleatorias, buscar } from "@/lib/catalogo/cliente";
import { addToCart } from "@/lib/cart";
import { usePrecios } from "@/hooks/usePrecios";
import {
  FINISHES,
  FINISH_INFO,
  defaultFinish,
  finishDisponible,
  formatCLP,
  type Finish,
} from "@/lib/pricing";

/**
 * Una carta de la grilla, con su propio contador.
 *
 * La cantidad vive acá y no en el buscador porque es de esta carta: subir a
 * tres una no tiene por qué mover las demás. Al agregar vuelve a 1, que es lo
 * que se espera al pasar a la siguiente.
 *
 * La imagen sigue llevando a la ficha. Ahí están las cosas que no caben en una
 * grilla —las otras versiones del mismo arte, MPCFill, el dorso— y el atajo no
 * las reemplaza: solo evita entrar cuando la carta que se ve ya es la buena.
 */
function TarjetaCarta({
  card,
  finish,
  onVer,
}: {
  card: CartaCatalogo;
  finish: Finish;
  onVer: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [agregada, setAgregada] = useState(false);

  const agregar = () => {
    addToCart({
      id: card.uid,
      juego: card.juego,
      idioma: card.idioma,
      name: card.name,
      set: card.set,
      set_name: card.set_name,
      collector_number: card.collector_number,
      image: card.imagenes.small,
      finish,
      quantity: qty,
    });
    setQty(1);
    setAgregada(true);
    window.setTimeout(() => setAgregada(false), 1400);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative glass-card rounded-lg overflow-hidden hover:border-[#FF4D1A]/50 transition-colors flex flex-col"
    >
      <button onClick={onVer} className="text-left" title="Ver la carta">
        <div
          className={
            "relative overflow-hidden " +
            (card.apaisada ? "aspect-[7/5]" : "aspect-[5/7]")
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imagenes.normal}
            alt={card.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="px-3 pt-3">
          <p className="font-semibold text-sm truncate">{card.name}</p>
          <p className="text-xs text-gray-400 uppercase truncate">
            {card.set_name}
          </p>
        </div>
      </button>

      <div className="px-3 pb-3 pt-2 mt-auto space-y-2">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Una menos"
            className="w-9 h-9 rounded border border-white/15 flex items-center justify-center text-gray-300 hover:border-white/40 disabled:opacity-30"
          >
            <Minus size={15} />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => Math.min(99, q + 1))}
            aria-label="Una más"
            className="w-9 h-9 rounded border border-white/15 flex items-center justify-center text-gray-300 hover:border-white/40"
          >
            <Plus size={15} />
          </button>
        </div>
        <button
          onClick={agregar}
          className={
            "w-full py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 " +
            (agregada
              ? "bg-green-500/20 text-green-400 border border-green-500/40"
              : "bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 text-white")
          }
        >
          {agregada ? (
            <>
              <Check size={13} /> Agregada
            </>
          ) : (
            "Agregar"
          )}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * El buscador del catálogo.
 *
 * La búsqueda y el juego llegan como props desde la página, que los lee de la
 * URL en el servidor. Antes esto usaba `useSearchParams`, que deja la página
 * prerenderizada y obliga a envolverla en un Suspense: el contenido real
 * quedaba esperando la hidratación y, si algo la demoraba, el visitante se
 * quedaba mirando el spinner para siempre. La guía de Next recomienda
 * justamente leer `searchParams` en la página y pasarlo hacia abajo.
 */
export default function Buscador({
  q,
  juego,
  idioma,
}: {
  q: string;
  juego: JuegoId;
  idioma: IdiomaId;
}) {
  const router = useRouter();
  const catalogo = catalogoDeJuego(juego);

  const [query, setQuery] = useState(q);
  const [cards, setCards] = useState<CartaCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<"search" | "random">("random");

  // El acabado con el que se agrega desde la grilla. Uno solo para toda la
  // búsqueda: elegirlo carta por carta convertiría el atajo en el formulario
  // del que estamos tratando de librarnos, y en el carrito se puede cambiar.
  const { precios } = usePrecios();
  // Se deriva en vez de guardarse ya resuelto: los precios llegan por fetch,
  // así que el primer render no sabe todavía cuáles hay. Con estado habría
  // que corregirlo desde un efecto, que es un render de más y una cascada.
  const [elegido, setFinish] = useState<Finish | null>(null);
  const finish =
    elegido && finishDisponible(precios, elegido)
      ? elegido
      : defaultFinish(precios);
  const acabadosVivos = FINISHES.filter((f) => precios.disponible[f]);

  const handleSearch = useCallback(
    async (texto: string, deJuego: JuegoId, enIdioma: IdiomaId) => {
    setLoading(true);
    setMode("search");
    const res = await buscar(deJuego, texto, enIdioma);
    setCards(res.cartas);
    setTotal(res.total);
    setLoading(false);
    },
    []
  );

  const loadRandom = useCallback(
    async (deJuego: JuegoId, enIdioma: IdiomaId) => {
    setLoading(true);
    setMode("random");
    const data = await aleatorias(deJuego, 10, enIdioma);
    setCards(data);
    setTotal(data.length);
    setLoading(false);
    },
    []
  );

  useEffect(() => {
    if (q) {
      setQuery(q);
      handleSearch(q, juego, idioma);
    } else {
      loadRandom(juego, idioma);
    }
  }, [q, juego, idioma, handleSearch, loadRandom]);

  /** La URL manda: el juego y la búsqueda viven ahí para poder compartir el link. */
  const irA = (texto: string, aJuego: JuegoId, aIdioma: IdiomaId) => {
    const params = new URLSearchParams();
    if (texto.trim()) params.set("q", texto.trim());
    if (aJuego !== JUEGO_DEFAULT) params.set("juego", aJuego);
    if (aIdioma !== IDIOMA_BASE) params.set("idioma", aIdioma);
    const qs = params.toString();
    router.push("/catalogo" + (qs ? "?" + qs : ""));
  };

  /**
  * Cambiar de juego puede dejar el idioma huérfano: Yu-Gi-Oh no tiene español
  * y Riftbound solo tiene inglés. En vez de mandar a una URL que el servidor
  * va a corregir en silencio, se corrige acá.
  */
  const cambiarJuego = (aJuego: JuegoId) => {
    const sirve = catalogoDeJuego(aJuego).idiomas;
    irA(query, aJuego, sirve.includes(idioma) ? idioma : IDIOMA_BASE);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) irA(query, juego, idioma);
  };

  return (
    <main className="min-h-screen bg-[#0b0d11] text-white">
      <NavBar />

      <section className="px-6 py-10 max-w-6xl mx-auto">
        <Reveal className="flex items-start justify-between gap-4 mb-2 flex-wrap">
          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl">
              Catálogo <span className="text-lava">{catalogo.corto}</span>
            </h1>
            <p className="text-gray-400 mt-2">
              {mode === "random"
                ? "Selección aleatoria del momento. Usa el buscador para encontrar cartas específicas."
                : "Resultados de búsqueda"}
            </p>
          </div>
          {mode === "random" && (
            <button
              onClick={() => loadRandom(juego, idioma)}
              className="glass-card hover:border-[#FF4D1A]/50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
            >
              <Shuffle size={16} /> Otras aleatorias
            </button>
          )}
        </Reveal>

        {/* Con un solo juego el selector sería una pestaña sola: no se muestra. */}
        {CATALOGOS.length > 1 && (
          <div className="flex gap-2 flex-wrap mt-6">
            {CATALOGOS.map((c) => (
              <button
                key={c.id}
                onClick={() => cambiarJuego(c.id)}
                className={
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-colors border " +
                  (c.id === juego
                    ? "bg-[#FF4D1A]/15 border-[#FF4D1A]/60 text-white"
                    : "glass-card border-white/10 text-gray-300 hover:border-white/30")
                }
              >
                {c.corto}
              </button>
            ))}
          </div>
        )}

        {/* Solo los idiomas que ESTA fuente entrega: prometer uno que no
            existe se paga en el despacho, no en la búsqueda. */}
        {catalogo.idiomas.length > 1 && (
          <div className="flex gap-2 flex-wrap mt-3 items-center">
            <span className="text-xs text-gray-500 mr-1">Idioma:</span>
            {catalogo.idiomas.map((id) => (
              <button
                key={id}
                onClick={() => irA(query, juego, id)}
                className={
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-colors border " +
                  (id === idioma
                    ? "bg-white/10 border-white/40 text-white"
                    : "border-white/10 text-gray-400 hover:border-white/30")
                }
              >
                {etiquetaDeIdioma(id)}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 mb-4 mt-6">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={18}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={catalogo.placeholder}
              className="w-full glass-card rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#FF4D1A]/60 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-6 py-3 rounded-lg font-semibold transition-all shadow-[0_4px_20px_-4px_rgba(255,79,26,0.5)]"
          >
            Buscar
          </button>
        </form>

        {catalogo.ayuda ? (
          <div className="text-xs text-gray-500 mb-2">{catalogo.ayuda}</div>
        ) : null}
        {catalogo.aviso ? (
          <div className="text-xs text-gray-400 mb-2">{catalogo.aviso}</div>
        ) : null}
        <div className="mb-8" />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
          </div>
        ) : null}

        {!loading && cards.length === 0 ? (
          <p className="text-center text-gray-400 py-20">
            No se encontraron cartas. Prueba con otra búsqueda.
          </p>
        ) : null}

        {!loading && cards.length > 0 ? (
          <>
            {mode === "search" && (
              <p className="text-sm text-gray-400 mb-4">
                {total.toLocaleString("es-CL")} cartas encontradas (mostrando{" "}
                {cards.length})
              </p>
            )}
            {acabadosVivos.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-4 items-center">
                <span className="text-xs text-gray-500 mr-1">
                  Agregar como:
                </span>
                {acabadosVivos.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFinish(f)}
                    className={
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-colors border " +
                      (f === finish
                        ? "bg-white/10 border-white/40 text-white"
                        : "border-white/10 text-gray-400 hover:border-white/30")
                    }
                  >
                    {FINISH_INFO[f].corto} · {formatCLP(precios.unitario[f])}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cards.map((card) => (
                <TarjetaCarta
                  key={card.uid}
                  card={card}
                  finish={finish}
                  onVer={() =>
                    router.push("/carta/" + encodeURIComponent(card.uid))
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
