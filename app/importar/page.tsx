"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Upload,
  FileUp,
  CheckCircle2,
  ShoppingCart,
  FileText,
  AlertTriangle,
  Link2,
  Minus,
  Plus,
  X,
  Sparkles,
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
  esIdioma,
  etiquetaDeIdioma,
  IDIOMA_BASE,
  type CartaCatalogo,
  type IdiomaId,
} from "@/lib/catalogo";
import { versiones } from "@/lib/catalogo/cliente";
import { addToCart } from "@/lib/cart";
import {
  FINISHES,
  calculateTotalWith,
  defaultFinish,
  finishDisponible,
  formatCLP,
  type Finish,
} from "@/lib/pricing";
import FinishButtons from "@/components/FinishButtons";
import { usePrecios } from "@/hooks/usePrecios";
import {
  resolverPrecon,
  resolverXmlMpc,
  tokensDeLaLista,
  traerMazo,
  traerPrecon,
} from "@/lib/preconImport";
import { rutaPrecon } from "@/lib/precons";
import { rutaMazo } from "@/lib/mazos";
import type { MpcCard } from "@/app/api/mpcfill/route";

type CardWithFinish = ImportedCard & {
  finish?: Finish;
  /** El arte HD de MPCFill elegido para esta carta, si cambió el oficial. */
  mpc?: MpcCard;
};

/**
 * La revisión a medio hacer, guardada en el navegador.
 *
 * Revisar cien cartas toma un rato, y cerrar la pestaña sin querer lo botaba
 * todo. Se guarda sola mientras se revisa y se ofrece retomarla al volver; no
 * se restaura sin preguntar, porque quien vuelve a pegar una lista nueva no
 * quiere encontrarse la de ayer.
 */
const BORRADOR = "importar-borrador";

type Borrador = {
  cards: CardWithFinish[];
  text: string;
  globalFinish: Finish;
  idioma: IdiomaId;
  precon: { nombre: string; ruta: string } | null;
};

function leerBorrador(): Borrador | null {
  try {
    const b = JSON.parse(localStorage.getItem(BORRADOR) || "null");
    return b && Array.isArray(b.cards) && b.cards.length > 0 ? (b as Borrador) : null;
  } catch {
    return null;
  }
}

function borrarBorrador() {
  try {
    localStorage.removeItem(BORRADOR);
  } catch {
    // sin almacenamiento no hay nada que borrar
  }
}

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

  // El enlace de un mazo, como alternativa a pegar la lista.
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ ok: boolean; texto: string } | null>(
    null
  );

  // Cuando se llega desde la página de un precon: el mazo que se está
  // revisando. Cambia la cabecera y esconde el formulario de pegar lista.
  const [precon, setPrecon] = useState<{ nombre: string; ruta: string } | null>(
    null
  );
  const [errorPrecon, setErrorPrecon] = useState("");
  const [cargandoTokens, setCargandoTokens] = useState(false);
  const [tokensListos, setTokensListos] = useState(false);
  const arranco = useRef(false);

  // Artes HD de MPCFill, por nombre de carta. `null` es "buscando".
  const [mpcPorNombre, setMpcPorNombre] = useState<
    Record<string, MpcCard[] | null>
  >({});
  const [mpcError, setMpcError] = useState("");

  // Agregar cartas a una revisión ya abierta.
  const [panelAgregar, setPanelAgregar] = useState(false);
  const [textoExtra, setTextoExtra] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [archivoMsg, setArchivoMsg] = useState("");

  // Una revisión anterior sin terminar, para ofrecer retomarla.
  const [pendiente, setPendiente] = useState<Borrador | null>(null);

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

  // Llegada desde un precon: /importar?precon=fdc/reign-of-dragons&…
  //
  // Se lee de `window.location` y no con `useSearchParams` porque ese hook
  // obliga a envolver la página entera en un Suspense solo para esto.
  useEffect(() => {
    if (arranco.current) return;
    arranco.current = true;

    const p = new URLSearchParams(window.location.search);
    const [set, slug] = (p.get("precon") ?? "").split("/");
    // Un mazo listo llega igual que un precon, con su propio parámetro.
    const mazoListo = p.get("mazo") ?? "";
    if ((!set || !slug) && !mazoListo) {
      // Solo al llegar sin mazo: quien viene desde un precon ya eligió qué
      // revisar, y ofrecerle otra lista ahí es estorbar.
      setPendiente(leerBorrador());
      return;
    }

    const acabado = p.get("acabado");
    if (acabado && FINISHES.includes(acabado as Finish)) {
      setGlobalFinish(acabado as Finish);
    }
    const lang = p.get("idioma") ?? "";
    const idiomaPedido: IdiomaId = esIdioma(lang) ? lang : IDIOMA_BASE;
    setIdioma(idiomaPedido);
    const conTokens = p.get("tokens") === "1";

    (async () => {
      setLoading(true);
      const mazo = mazoListo ? await traerMazo(mazoListo) : await traerPrecon(set, slug);
      if (!mazo) {
        setErrorPrecon("No encontramos ese mazo. Puedes pegar la lista acá abajo.");
        setLoading(false);
        return;
      }
      setPrecon({
        nombre: mazo.nombre,
        ruta: mazoListo ? rutaMazo({ slug: mazoListo }) : rutaPrecon({ set, slug }),
      });
      setCards(await resolverPrecon(mazo, idiomaPedido, conTokens));
      // Vengan o no: en un precon los tokens se deciden en su página.
      setTokensListos(true);
      setLoading(false);
    })();
  }, []);

  // Guardar sola la revisión mientras haya algo que revisar.
  useEffect(() => {
    if (loading || cards.length === 0) return;
    try {
      const b: Borrador = { cards, text, globalFinish, idioma, precon };
      localStorage.setItem(BORRADOR, JSON.stringify(b));
    } catch {
      // Almacenamiento lleno o bloqueado: la revisión sigue, solo no se guarda.
    }
  }, [cards, text, globalFinish, idioma, precon, loading]);

  const retomar = () => {
    if (!pendiente) return;
    setCards(pendiente.cards);
    setText(pendiente.text ?? "");
    if (FINISHES.includes(pendiente.globalFinish)) setGlobalFinish(pendiente.globalFinish);
    if (esIdioma(pendiente.idioma)) setIdioma(pendiente.idioma);
    setPrecon(pendiente.precon ?? null);
    setTokensListos(true);
    setPendiente(null);
  };

  const descartarPendiente = () => {
    borrarBorrador();
    setPendiente(null);
  };

  const buscarMpc = async (nombre: string) => {
    if (nombre in mpcPorNombre) return;
    setMpcError("");
    setMpcPorNombre((prev) => ({ ...prev, [nombre]: null }));
    try {
      const res = await fetch("/api/mpcfill?q=" + encodeURIComponent(nombre));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "MPCFill no respondió.");
      setMpcPorNombre((prev) => ({ ...prev, [nombre]: data.cards || [] }));
    } catch (err) {
      setMpcError(err instanceof Error ? err.message : "MPCFill no respondió.");
      // Se saca la marca de "buscando" para que se pueda reintentar.
      setMpcPorNombre((prev) => {
        const next = { ...prev };
        delete next[nombre];
        return next;
      });
    }
  };

  const chooseMpc = (idx: number, mpc: MpcCard) => {
    setCards((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], mpc };
      return next;
    });
    setPrintPickerIdx(null);
  };

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
      next[idx] = { ...next[idx], card: print, mpc: undefined };
      return next;
    });
    setPrintPickerIdx(null);
  };

  /**
   * Suma cartas a la revisión que ya está abierta.
   *
   * Si la carta ya estaba —la misma impresión, con el mismo arte— se suma la
   * cantidad en vez de repetir la línea: quien agrega "4 Forest" a un mazo que
   * ya tenía Forest espera una línea con más copias, no dos.
   */
  const fusionar = (previas: CardWithFinish[], nuevas: CardWithFinish[]) => {
    const todas = [...previas];
    for (const n of nuevas) {
      const i =
        n.status === "ok" && n.card
          ? todas.findIndex(
              (p) =>
                p.status === "ok" &&
                p.card?.uid === n.card!.uid &&
                (p.mpc?.id ?? "") === (n.mpc?.id ?? "") &&
                Boolean(p.isSideboard) === Boolean(n.isSideboard)
            )
          : -1;
      if (i >= 0) todas[i] = { ...todas[i], quantity: todas[i].quantity + n.quantity };
      else todas.push(n);
    }
    return todas;
  };

  const analizar = async (lista: string, sumar = false) => {
    const parsed = parseDeck(lista);
    if (parsed.length === 0) {
      alert("No se detectaron cartas válidas. Revisa el formato.");
      return;
    }
    if (sumar) {
      // La revisión sigue a la vista mientras llegan las cartas nuevas.
      setAgregando(true);
      const nuevas = await resolveDeck(parsed, undefined, idioma);
      setCards((prev) => fusionar(prev, nuevas));
      setTokensListos(false);
      setTextoExtra("");
      setAgregando(false);
      return;
    }
    setLoading(true);
    setProgress({ done: 0, total: parsed.length });
    setCards([]);
    setPendiente(null);
    setTokensListos(false);
    setPrintPickerIdx(null);
    const resolved = await resolveDeck(
      parsed,
      (done, total) => setProgress({ done, total }),
      idioma
    );
    setCards(resolved);
    setLoading(false);
  };

  /**
   * Un archivo: el cards.xml de MPCFill, con el arte ya elegido en cada
   * carta, o una lista en .txt. `sumar` lo agrega a la revisión abierta.
   */
  const subirArchivo = async (archivo: File | undefined, sumar = false) => {
    if (!archivo) return;
    setArchivoMsg("");
    if (archivo.size > 2 * 1024 * 1024) {
      setArchivoMsg("Ese archivo pesa más de 2 MB. Un pedido de MPCFill pesa mucho menos.");
      return;
    }
    const contenido = await archivo.text();
    const esXml = /\.xml$/i.test(archivo.name) || contenido.trimStart().startsWith("<");
    if (!esXml) {
      if (!sumar) setText(contenido);
      await analizar(contenido, sumar);
      return;
    }
    if (sumar) setAgregando(true);
    else {
      setLoading(true);
      setProgress({ done: 0, total: 0 });
      setCards([]);
      setPendiente(null);
      setPrintPickerIdx(null);
    }
    try {
      const nuevas = await resolverXmlMpc(contenido);
      setCards((prev) => (sumar ? fusionar(prev, nuevas) : nuevas));
      // El XML ya trae los tokens que el cliente quiso: no se le ofrecen más.
      if (!sumar) setTokensListos(true);
    } catch (err) {
      setArchivoMsg(err instanceof Error ? err.message : "No pudimos leer ese archivo.");
    } finally {
      setLoading(false);
      setAgregando(false);
    }
  };

  const traerDeEnlace = async (sumar = false) => {
    const url = linkUrl.trim();
    if (!url) return;
    setLinkLoading(true);
    setLinkMsg(null);
    try {
      const res = await fetch("/api/mazo-link?url=" + encodeURIComponent(url));
      const json = await res.json();
      if (!res.ok) {
        setLinkMsg({ ok: false, texto: json.error || "No pudimos traer ese mazo." });
        return;
      }
      if (!sumar) setText(json.lista);
      setLinkMsg({
        ok: true,
        texto: json.nombre
          ? `Trajimos "${json.nombre}" desde ${json.origen}.`
          : `Trajimos tu mazo desde ${json.origen}.`,
      });
      await analizar(json.lista, sumar);
      if (sumar) setLinkUrl("");
    } catch {
      setLinkMsg({
        ok: false,
        texto: "No pudimos traer ese mazo. Prueba de nuevo o pega la lista.",
      });
    } finally {
      setLinkLoading(false);
    }
  };

  const updateCardFinish = (idx: number, finish: Finish) => {
    setCards((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], finish };
      return next;
    });
  };

  // Quitar una carta: lo que hace quien ya tiene la mitad del mazo en casa.
  const quitar = (idx: number) => {
    setPrintPickerIdx(null);
    // Al quitar la última ya no queda revisión que guardar.
    if (cards.length <= 1) borrarBorrador();
    setCards((prev) => prev.filter((_, i) => i !== idx));
  };

  const cambiarCantidad = (idx: number, delta: number) => {
    setCards((prev) => {
      const next = [...prev];
      const cantidad = Math.max(1, Math.min(99, next[idx].quantity + delta));
      next[idx] = { ...next[idx], quantity: cantidad };
      return next;
    });
  };

  const sumarTokens = async () => {
    setCargandoTokens(true);
    const tokens = await tokensDeLaLista(cards);
    setCards((prev) => [...prev, ...tokens]);
    setTokensListos(true);
    setCargandoTokens(false);
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
      // Con arte de MPCFill la línea lleva id propio, igual que desde la
      // ficha: así no se mezcla en el carrito con la versión oficial.
      addToCart({
        id: c.mpc ? `${c.card.uid}-mpc-${c.mpc.id}` : c.card.uid,
        juego: c.card.juego,
        idioma: c.card.idioma,
        name: c.card.name,
        set: c.card.set,
        set_name: c.mpc ? `MPCFill HD · ${c.mpc.name}` : c.card.set_name,
        collector_number: c.card.collector_number,
        image: c.mpc ? c.mpc.thumb : c.card.imagenes.normal,
        finish: getFinish(c),
        quantity: c.quantity,
        ...(c.mpc ? { mpcfillId: c.mpc.id } : {}),
      });
    });
    // Ya está en el carrito: no hay nada que retomar.
    borrarBorrador();
    router.push("/carrito");
  };

  const okCards = cards.filter((c) => c.status === "ok");
  // Las que no se pudieron traer en el idioma pedido, para decirlo una vez
  // arriba en vez de obligar a contar las etiquetas amarillas. Los tokens no
  // cuentan: casi ninguno existe traducido y nadie los espera en español.
  const sinTraducir = okCards.filter(
    (c) => c.card && !c.esToken && c.card.idioma !== idioma
  ).length;
  // Las líneas cuyo set+número apuntaba a otra carta. Se resolvieron por
  // nombre, pero el cliente tiene que enterarse: su lista traía un dato malo.
  const corregidas = okCards.filter((c) => c.aviso);
  const notFoundCards = cards.filter((c) => c.status === "not_found");
  // Lo que de verdad va al carrito: sin el sideboard si lo desmarcaron.
  const paraElCarrito = okCards.filter(
    (c) => includeSideboard || !c.isSideboard
  );
  const totalOk = paraElCarrito.reduce((s, c) => s + c.quantity, 0);
  // El mismo cálculo del carrito, promos incluidas. Antes era precio suelto
  // por cantidad, y un mazo de 100 mostraba acá más de lo que después cobraba
  // el carrito.
  const calculo = calculateTotalWith(
    precios,
    paraElCarrito.map((c) => ({
      id: c.card ? c.card.uid + (c.mpc ? "-mpc-" + c.mpc.id : "") : undefined,
      finish: getFinish(c),
      quantity: c.quantity,
    }))
  );
  const estimateTotal = calculo.total;
  const hayTokensPorOfrecer =
    !tokensListos && okCards.some((c) => c.tokenIds?.length);

  return (
    <main className="min-h-screen bg-surface text-ink-soft">
      <NavBar />

      <section className="px-6 py-10 max-w-5xl mx-auto">
        {precon ? (
          <Reveal className="mb-8">
            <p className="text-sm mb-2">
              <Link
                href={precon.ruta}
                className="font-bold text-flame-ink hover:underline"
              >
                ← Volver al mazo
              </Link>
            </p>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2 break-words text-ink">
              Revisa <span className="text-lava">{precon.nombre}</span>
            </h1>
            <p className="text-ink-muted max-w-2xl">
              Este es el mazo completo. Quita con la ✕ las cartas que ya
              tienes, cambia el arte de las que quieras y, cuando esté como lo
              quieres, agrégalo al carrito.
            </p>
          </Reveal>
        ) : (
          <Reveal className="mb-8">
            <FileText className="text-flame-ink mb-3" size={40} />
            <h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2 break-words">
              Importar lista{" "}
              <span className="text-lava">MTGO/Moxfield/Archidekt</span>
            </h1>
            <p className="text-ink-muted">
              Pega tu lista o el enlace de tu mazo y armamos tu pedido en
              segundos.{" "}
              <Link
                href="/precons"
                className="font-bold text-flame-ink underline underline-offset-2"
              >
                ¿No tienes lista? Mira los precons de Commander
              </Link>
              .
            </p>
          </Reveal>
        )}

        {pendiente && cards.length === 0 && !loading ? (
          <div className="block-card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              <b className="text-ink">Dejaste una revisión sin terminar</b>
              {pendiente.precon ? `: ${pendiente.precon.nombre}` : ""} (
              {pendiente.cards.reduce((s, c) => s + (c.quantity || 0), 0)} cartas).
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={retomar} className="btn-flame px-4 py-2 text-sm">
                Retomarla
              </button>
              <button
                type="button"
                onClick={descartarPendiente}
                className="btn-ghost px-4 py-2 text-sm"
              >
                Descartar
              </button>
            </div>
          </div>
        ) : null}

        {errorPrecon ? (
          <p className="bg-yellow-500/10 border border-amber-700/35 text-amber-700 text-sm p-3 rounded-lg mb-6">
            {errorPrecon}
          </p>
        ) : null}

        {precon ? (
          // En un precon no hay lista que pegar: queda solo lo que todavía
          // se puede decidir acá, que es el acabado.
          <div className="glass-card p-5 rounded-xl mb-6 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
            <div>
              <p className="text-xs text-ink-muted mb-1.5">
                Acabado de todo el mazo (puedes cambiar cartas sueltas abajo)
              </p>
              <div className="max-w-sm">
                <FinishButtons
                  precios={precios}
                  value={globalFinish}
                  onChange={setGlobalFinish}
                />
              </div>
            </div>
            <p className="text-sm text-ink-muted">
              Idioma: <b className="text-ink">{etiquetaDeIdioma(idioma)}</b>
              <br />
              <Link href={precon.ruta} className="text-flame-ink font-bold hover:underline">
                Cambiarlo
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              {/* Por enlace. Va primero porque es lo más corto de hacer. */}
              <label htmlFor="mazo-link" className="block text-sm font-semibold mb-2">
                El enlace de tu mazo
              </label>
              <div className="flex gap-2 mb-1.5">
                <div className="relative flex-1">
                  <Link2
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  />
                  <input
                    id="mazo-link"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") traerDeEnlace();
                    }}
                    placeholder="https://archidekt.com/decks/123456/mi-mazo"
                    className="w-full glass-card rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-flame"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => traerDeEnlace()}
                  disabled={linkLoading || loading || !linkUrl.trim()}
                  className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2 whitespace-nowrap"
                >
                  {linkLoading ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : null}
                  Traer mazo
                </button>
              </div>
              {linkMsg ? (
                <p
                  role="status"
                  className={
                    "text-xs mb-3 " +
                    (linkMsg.ok ? "text-green-700" : "text-amber-700")
                  }
                >
                  {linkMsg.texto}
                </p>
              ) : (
                <p className="text-xs text-ink-faint mb-3">
                  Por enlace leemos Archidekt. De Moxfield y los demás, exporta
                  el mazo como texto y pégalo acá abajo.
                </p>
              )}

              <label htmlFor="mazo-lista" className="block text-sm font-semibold mb-2">
                O pega tu lista
              </label>
              <textarea
                id="mazo-lista"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={EXAMPLE}
                className="w-full glass-card rounded-lg p-4 text-sm font-mono min-h-[240px] focus:outline-none focus:border-flame"
              />
              <p className="text-xs text-ink-faint mt-2">
                Acepta <code>1 Carta</code>, <code>1 Carta (SET)</code>,{" "}
                <code>1 Carta (SET) 123</code>. Si trae la edición, imprimimos
                esa misma.
              </p>

              {/* El cards.xml de MPCFill: quien ya eligió sus artes allá no
                  tiene por qué elegirlos de nuevo acá. */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="btn-ghost px-4 py-2.5 text-sm inline-flex items-center gap-2 cursor-pointer">
                  <FileUp size={16} /> Subir archivo
                  <input
                    type="file"
                    accept=".xml,.txt,text/xml,text/plain"
                    className="sr-only"
                    onChange={(e) => {
                      subirArchivo(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-xs text-ink-faint flex-1 min-w-[200px]">
                  El <code>cards.xml</code> que baja mpcfill.com con Download —
                  respetamos el arte que elegiste en cada carta — o una lista
                  en <code>.txt</code>.
                </p>
              </div>
              {archivoMsg ? (
                <p role="alert" className="text-xs text-amber-700 mt-2">
                  {archivoMsg}
                </p>
              ) : null}
            </div>

            <div className="glass-card p-5 rounded-xl h-fit">
              <h3 className="font-bold mb-3">Configuración</h3>

              <label className="block text-xs text-ink-muted mb-1">
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
              <label className="block text-xs text-ink-muted mb-1">
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
                        ? "bg-ink border-ink text-ink-invert"
                        : "border-line text-ink-muted hover:border-line")
                    }
                  >
                    {etiquetaDeIdioma(id)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-faint mb-4">
                Pega la lista en inglés igual: la carta que no exista en el idioma
                elegido — o que solo tenga una imagen sin escanear — se queda en
                inglés, y abajo verás cuál es cuál.
              </p>

              <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSideboard}
                  onChange={(e) => setIncludeSideboard(e.target.checked)}
                  className="accent-flame"
                />
                Incluir sideboard (SB:)
              </label>

              <button
                onClick={() => analizar(text)}
                disabled={loading || !text.trim()}
                className="w-full btn-flame py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:shadow-none"
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
        )}

        {loading && progress.total > 0 && (
          <div className="glass-card p-4 rounded-xl mb-6">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-ink-muted">Buscando en Scryfall...</span>
              <span className="text-flame-ink font-semibold">
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-ink/5 rounded-full h-2 overflow-hidden">
              <div
                className="bg-flame h-full transition-all"
                style={{
                  width: (progress.done / progress.total) * 100 + "%",
                }}
              />
            </div>
          </div>
        )}

        {loading && progress.total === 0 && (
          <div className="glass-card p-6 rounded-xl mb-6 flex items-center gap-3 text-ink-muted">
            <Loader2 className="animate-spin text-flame-ink" size={20} />
            Cargando el mazo…
          </div>
        )}

        {!loading && cards.length > 0 && (
          <>
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-ink-muted uppercase">En tu pedido</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {totalOk}{" "}
                  <span className="text-sm text-ink-muted">
                    {totalOk === 1 ? "carta" : "cartas"}
                  </span>
                </p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-ink-muted uppercase">No encontradas</p>
                <p className="text-2xl font-bold text-red-700 mt-1">
                  {notFoundCards.length}
                </p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <p className="text-xs text-ink-muted uppercase">
                  Total estimado
                </p>
                <p className="text-2xl font-display font-bold text-lava mt-1">
                  {formatCLP(estimateTotal)}
                </p>
              </div>
            </div>

            {notFoundCards.length > 0 && (
              <div className="bg-yellow-500/10 border border-amber-700/35 p-4 rounded-xl mb-6">
                <p className="font-semibold text-amber-700 flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} /> Cartas no encontradas
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {notFoundCards.map((c, idx) => (
                    <li key={idx}>
                      • {c.raw}{" "}
                      <span className="text-xs">({c.errorMsg})</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-700 mt-3">
                  Tip: revisa la escritura del nombre. También puedes subirlas
                  como cartas custom si tienes la imagen.
                </p>
              </div>
            )}

            {/* Los tokens que crea el mazo. Se ofrecen, no se suman solos:
                son cartas que se cobran. */}
            {hayTokensPorOfrecer ? (
              <div className="block-card p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-soft flex items-start gap-2.5 max-w-xl">
                  <Sparkles size={18} className="text-flame-ink shrink-0 mt-0.5" />
                  <span>
                    <b className="text-ink">Tu mazo crea tokens.</b> Podemos
                    sumar uno de cada uno a la lista; después quitas los que no
                    quieras.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={sumarTokens}
                  disabled={cargandoTokens}
                  className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
                >
                  {cargandoTokens ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : null}
                  Sumar los tokens
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <h2 className="font-bold text-lg">
                Cartas detectadas ({okCards.length})
              </h2>
              <button
                type="button"
                onClick={() => setPanelAgregar((v) => !v)}
                aria-expanded={panelAgregar}
                className="btn-ghost px-3.5 py-1.5 text-sm inline-flex items-center gap-1.5"
              >
                <Plus size={15} /> Agregar cartas
              </button>
            </div>

            {panelAgregar ? (
              <div className="glass-card rounded-xl p-4 mb-4">
                <label htmlFor="extra-lista" className="block text-sm font-semibold mb-1.5">
                  Pega las cartas que quieres sumar, una por línea
                </label>
                <textarea
                  id="extra-lista"
                  value={textoExtra}
                  onChange={(e) => setTextoExtra(e.target.value)}
                  placeholder={"1 Sol Ring\n4 Forest"}
                  className="w-full bg-surface border border-line rounded-lg p-3 text-sm font-mono min-h-[96px] focus:outline-none focus:border-flame"
                />
                <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                  <button
                    type="button"
                    onClick={() => analizar(textoExtra, true)}
                    disabled={agregando || !textoExtra.trim()}
                    className="btn-flame px-4 py-2 text-sm inline-flex items-center gap-2"
                  >
                    {agregando ? <Loader2 className="animate-spin" size={15} /> : null}
                    Agregar a la lista
                  </button>
                  <label className="btn-ghost px-4 py-2 text-sm inline-flex items-center gap-2 cursor-pointer">
                    <FileUp size={15} /> Subir XML o .txt
                    <input
                      type="file"
                      accept=".xml,.txt,text/xml,text/plain"
                      className="sr-only"
                      disabled={agregando}
                      onChange={(e) => {
                        subirArchivo(e.target.files?.[0], true);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <input
                    aria-label="Enlace de otro mazo en Archidekt"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="O el enlace de otro mazo en Archidekt"
                    className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-flame"
                  />
                  <button
                    type="button"
                    onClick={() => traerDeEnlace(true)}
                    disabled={agregando || linkLoading || !linkUrl.trim()}
                    className="btn-ghost px-4 py-2 text-sm whitespace-nowrap"
                  >
                    Traer y sumar
                  </button>
                </div>
                {archivoMsg || (linkMsg && !linkMsg.ok) ? (
                  <p role="alert" className="text-xs text-amber-700 mt-2">
                    {archivoMsg || linkMsg?.texto}
                  </p>
                ) : null}
                <p className="text-xs text-ink-faint mt-2">
                  Si ya tenías alguna de estas cartas en la lista, sumamos la
                  cantidad en vez de repetirla.
                </p>
              </div>
            ) : null}
            {corregidas.length > 0 ? (
              <div className="bg-yellow-500/10 border border-amber-700/35 rounded-lg p-3 mb-3">
                <p className="text-xs text-amber-700 font-semibold mb-1">
                  {corregidas.length === 1
                    ? "Una línea traía un set y número que no correspondían a esa carta"
                    : `${corregidas.length} líneas traían un set y número que no correspondían a esa carta`}
                </p>
                <ul className="text-[11px] text-amber-700 space-y-0.5">
                  {corregidas.map((c, i) => (
                    <li key={i}>• {c.aviso}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-700 mt-1">
                  Pasa con listas viejas o escritas a mano. Revisa que las cartas
                  de abajo sean las que querías.
                </p>
              </div>
            ) : null}
            {sinTraducir > 0 ? (
              <p className="text-xs text-amber-700 mb-3">
                {sinTraducir} de {okCards.filter((c) => !c.esToken).length} no
                existe en {etiquetaDeIdioma(idioma)} con una imagen imprimible,
                así que va en inglés. Están marcadas abajo.
              </p>
            ) : (
              <div className="mb-3" />
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {cards.map((c, idx) => {
                if (c.status !== "ok" || !c.card) return null;
                const cardFinish = getFinish(c);
                const imgSrc = c.mpc ? c.mpc.thumb : c.card.imagenes.normal;
                // MPCFill indexa por el nombre en inglés, que es el de la lista.
                const nombreMpc = c.name.split(" // ")[0];
                const artesMpc = mpcPorNombre[nombreMpc];
                return (
                  <div
                    key={c.card.uid + "-" + idx}
                    className="relative glass-card rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => quitar(idx)}
                      aria-label={"Quitar " + c.card.name}
                      title="Quitar del pedido"
                      className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-full bg-surface-2 border-2 border-ink text-ink flex items-center justify-center hover:bg-flame hover:text-white transition-colors"
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                    {c.esToken ? (
                      <span className="absolute top-1.5 left-1.5 z-10 badge bg-mana-w text-ink text-[10px] px-1.5 py-0.5">
                        Token
                      </span>
                    ) : null}
                    <div
                      role="img"
                      aria-label={c.card.name}
                      className="aspect-[5/7] bg-surface-3 bg-center bg-cover bg-no-repeat"
                      style={{ backgroundImage: "url(" + imgSrc + ")" }}
                    />
                    <div className="p-2">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-xs font-semibold truncate flex-1">
                          {c.card.name}
                        </p>
                        <CheckCircle2
                          size={12}
                          className="text-green-700 flex-shrink-0 mt-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-ink-muted truncate">
                        {c.mpc ? "MPCFill HD · " + c.mpc.name : c.card.set_name}
                      </p>
                      {/* Solo cuando NO salió en el idioma pedido: decirlo en
                          todas sería ruido, y callarlo sería la sorpresa que
                          llega en el sobre. */}
                      {!c.esToken && c.card.idioma !== idioma ? (
                        <p className="text-[10px] text-amber-700 truncate">
                          Solo en {etiquetaDeIdioma(c.card.idioma)}
                        </p>
                      ) : null}
                      {c.aviso ? (
                        <p
                          className="text-[10px] text-amber-700 truncate"
                          title={c.aviso}
                        >
                          Resuelta por nombre
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between mt-2 bg-ink/5 rounded">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(idx, -1)}
                          disabled={c.quantity <= 1}
                          aria-label={"Una menos de " + c.card.name}
                          className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold text-ink">
                          {c.quantity}×
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(idx, 1)}
                          aria-label={"Una más de " + c.card.name}
                          className="p-1.5 text-ink-muted hover:text-ink"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="mt-1">
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
                        className="w-full mt-1 py-1 text-[10px] rounded bg-ink/5 text-ink-muted hover:text-ink hover:bg-ink/10 transition"
                      >
                        {printPickerIdx === idx
                          ? "Cerrar"
                          : "🎨 Cambiar arte"}
                      </button>
                      {printPickerIdx === idx ? (
                        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                          {loadingPrints && !printsByOracle[c.card.grupoId] ? (
                            <Loader2
                              className="animate-spin text-flame-ink mx-auto my-2"
                              size={16}
                            />
                          ) : (
                            (printsByOracle[c.card.grupoId] || []).map(
                              (p) => (
                                <button
                                  key={p.uid}
                                  onClick={() => chooseArt(idx, p)}
                                  aria-label={p.set_name}
                                  title={p.set_name}
                                  className={
                                    "relative flex-shrink-0 w-10 aspect-[5/7] rounded border overflow-hidden bg-center bg-cover bg-no-repeat transition " +
                                    (p.uid === c.card!.uid
                                      ? "border-flame"
                                      : "border-line hover:border-line")
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
                      {/* Artes de la comunidad. Los tokens no: MPCFill los
                          guarda aparte y la búsqueda por nombre trae cartas. */}
                      {printPickerIdx === idx && !c.esToken ? (
                        <div className="mt-1">
                          {artesMpc === undefined ? (
                            <button
                              type="button"
                              onClick={() => buscarMpc(nombreMpc)}
                              className="w-full py-1 text-[10px] rounded border border-line text-flame-ink font-bold hover:border-ink transition"
                            >
                              ✨ Ver artes HD de MPCFill
                            </button>
                          ) : artesMpc === null ? (
                            <Loader2
                              className="animate-spin text-flame-ink mx-auto my-2"
                              size={16}
                            />
                          ) : artesMpc.length === 0 ? (
                            <p className="text-[10px] text-ink-muted">
                              No hay artes de esta carta en MPCFill.
                            </p>
                          ) : (
                            <div className="flex gap-1 overflow-x-auto pb-1">
                              {artesMpc.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => chooseMpc(idx, m)}
                                  aria-label={"Arte HD: " + m.name}
                                  title={m.name + " · " + m.dpi + " DPI"}
                                  className={
                                    "relative flex-shrink-0 w-14 aspect-[5/7] rounded border-2 overflow-hidden bg-center bg-cover bg-no-repeat transition " +
                                    (c.mpc?.id === m.id
                                      ? "border-flame"
                                      : "border-line hover:border-ink")
                                  }
                                  style={{ backgroundImage: `url(${m.thumb})` }}
                                />
                              ))}
                            </div>
                          )}
                          {mpcError && artesMpc === undefined ? (
                            <p className="text-[10px] text-red-700 mt-1">{mpcError}</p>
                          ) : null}
                        </div>
                      ) : null}
                      {c.isSideboard && (
                        <p className="text-[9px] text-amber-700 mt-1">
                          SIDEBOARD
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="glass-card p-5 rounded-xl flex flex-wrap items-center justify-between gap-4 sticky bottom-4 z-20">
              <div>
                <p className="text-xs text-ink-muted">Estimado total</p>
                <p className="text-2xl font-display font-bold text-lava">
                  {formatCLP(estimateTotal)}
                </p>
                <p className="text-xs text-ink-faint">
                  {totalOk} {totalOk === 1 ? "carta" : "cartas"}
                  {calculo.applied && calculo.applied !== "Precio unitario"
                    ? " · " + calculo.applied
                    : " · la promo aplica sola al llegar a 60 o 100"}
                </p>
              </div>
              <button
                onClick={addAllToCart}
                className="btn-flame px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all"
              >
                <ShoppingCart size={18} /> Agregar todo al carrito
              </button>
            </div>
          </>
        )}

        {!loading && cards.length === 0 && !precon && (
          <div className="glass-card p-6 rounded-xl">
            <h3 className="font-bold mb-3">📖 Cómo exportar tu lista</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-flame-ink mb-1">Moxfield</p>
                <p className="text-ink-muted text-xs">
                  Tu mazo → More → Export → MTGO format → Copy → pégalo aquí.
                </p>
              </div>
              <div>
                <p className="font-semibold text-flame-ink mb-1">Archidekt</p>
                <p className="text-ink-muted text-xs">
                  Pega el enlace del mazo arriba y listo. O: Export → MTGO/Plain
                  Text → Copy.
                </p>
              </div>
              <div>
                <p className="font-semibold text-flame-ink mb-1">MTGO/Arena</p>
                <p className="text-ink-muted text-xs">
                  Export decklist → guardar como .txt → abrir y copiar → pégalo
                  aquí.
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && cards.length === 0 && precon ? (
          <div className="glass-card p-6 rounded-xl text-center">
            <p className="text-ink-soft mb-4">Quitaste todas las cartas del mazo.</p>
            <Link href={precon.ruta} className="btn-ghost px-5 py-2.5 inline-block">
              Volver al mazo
            </Link>
          </div>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}
