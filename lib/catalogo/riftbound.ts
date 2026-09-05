/**
 * Catálogo de Riftbound (el TCG de League of Legends), sobre Riftcodex.
 *
 * Riftcodex es un proyecto de fans, no oficial, y no pide llave. Las imágenes
 * son las de Riot: salen del mismo CDN que la galería oficial, a 744×1039, la
 * misma clase que Scryfall — de los cuatro juegos que vendemos es el que
 * mejor se imprime junto con Magic.
 *
 * El CDN es Sanity y redimensiona por parámetro, así que la miniatura es un
 * `?w=`. **Solo hacia abajo**: pedirle 3000 de ancho devuelve una imagen de
 * 3000 px interpolada desde las 744 originales, o sea nitidez falsa. La
 * grande se pide nativa y el upscale lo hace Cardwright.
 */

import { TAMANO_INGLES } from "@/lib/formulas";
import { pedirJson } from "./http";
import { IDIOMA_BASE } from "./idiomas";
import {
  armarUid,
  type Catalogo,
  type CampoFicha,
  type CartaCatalogo,
  type ResultadoBusqueda,
} from "./tipos";

const API = "https://api.riftcodex.com";

const HEADERS = {
  "User-Agent": "VolcanProxies/1.0 (+https://volcanproxies.cl)",
  Accept: "application/json",
};

const REVALIDATE = 3600;

/** Lo máximo que acepta su paginado: con 200 devuelve una lista vacía. */
const MAX_POR_PAGINA = 100;

/** Cuántas páginas tiene el catálogo, recordado tras la primera consulta. */
let paginasConocidas: number | null = null;

type RiftCard = {
  id?: string;
  name?: string;
  collector_number?: number;
  attributes?: { energy?: number; might?: number; power?: number };
  classification?: {
	type?: string;
	supertype?: string;
	rarity?: string;
	domain?: string[];
  };
  text?: { plain?: string; rich?: string };
  set?: { set_id?: string; label?: string };
  media?: { image_url?: string; artist?: string };
  orientation?: string;
};

type RiftPagina = { items?: RiftCard[]; total?: number; pages?: number };

async function consultar(
  ruta: string,
  params: Record<string, string>
): Promise<RiftPagina> {
  const qs = new URLSearchParams(params).toString();
  const { ok, status, data } = await pedirJson<RiftPagina>(
	`${API}${ruta}?${qs}`,
	{ headers: HEADERS, revalidate: REVALIDATE }
  );
  if (status === 404) return {};
  if (!ok) throw new Error(`Riftcodex ${status}`);
  return data ?? {};
}

/** La imagen sin el parámetro de analítica que trae pegado. */
function base(url: string): string {
  return (url || "").split("?")[0];
}

function ancho(url: string, px: number): string {
  const b = base(url);
  return b ? `${b}?w=${px}` : "";
}

/**
 * El texto de reglas, en párrafos.
 *
 * `text.plain` junta las frases sin separador — "gain 1 XP.Spend 3 XP" — porque
 * les sacan las etiquetas sin poner nada en su lugar. `text.rich` sí trae los
 * `<br />` y los `<p>`, así que el salto de línea sale de ahí y el texto se lee
 * como en la carta.
 */
function aTexto(t: { plain?: string; rich?: string } | undefined): string {
  const rich = t?.rich;
  if (!rich) return simbolos(t?.plain ?? "");
  const conSaltos = rich
	.replace(/<br\s*\/?>/gi, "\n")
	.replace(/<\/p>\s*<p>/gi, "\n")
	.replace(/<[^>]+>/g, "")
	.replace(/&nbsp;/g, " ")
	.replace(/&amp;/g, "&")
	.replace(/&lt;/g, "<")
	.replace(/&gt;/g, ">")
	.replace(/\n{3,}/g, "\n\n")
	.trim();
  return simbolos(conSaltos);
}

/**
 * Los símbolos del juego, escritos como se leen.
 *
 * Riftcodex deja marcadores crudos en el texto: ":rb_might:", ":rb_energy_1:",
 * ":rb_rune_fury:". Tal cual, al cliente le llega "+1 :rb_might:", que no
 * significa nada. No hay set de íconos que podamos usar, así que se traducen a
 * palabras: "+1 Might", "1 Energy", "Runa de Fury".
 */
function simbolos(texto: string): string {
  return texto
	.replace(/:rb_energy_(\d+):/g, (_, n) => `${n} Energy`)
	.replace(/:rb_rune_rainbow:/g, "Runa de cualquier dominio")
	.replace(/:rb_rune_([a-z]+):/g, (_, d: string) => `Runa de ${mayus(d)}`)
	.replace(/:rb_([a-z_]+):/g, (_, k: string) => mayus(k.replace(/_/g, " ")))
	.trim();
}

function mayus(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function ficha(c: RiftCard): CampoFicha[] {
  const campos: CampoFicha[] = [];
  const cls = c.classification ?? {};
  const at = c.attributes ?? {};
  if (cls.type) campos.push({ label: "Tipo", value: cls.type });
  if (cls.supertype) campos.push({ label: "Supertipo", value: cls.supertype });
  if (cls.domain?.length) {
	campos.push({ label: "Dominio", value: cls.domain.join(" · ") });
  }
  // Energy, Might y Power van con su nombre en inglés porque así se llaman en
  // el juego: Riftbound es nuevo y no hay traducción asentada que un jugador
  // reconozca.
  if (typeof at.energy === "number") {
	campos.push({ label: "Energy", value: String(at.energy) });
  }
  if (typeof at.might === "number") {
	campos.push({ label: "Might", value: String(at.might) });
  }
  if (typeof at.power === "number") {
	campos.push({ label: "Power", value: String(at.power) });
  }
  return campos;
}

/** null cuando la carta no tiene imagen: sería un hueco en la grilla. */
function aCarta(c: RiftCard): CartaCatalogo | null {
  const img = base(c.media?.image_url ?? "");
  const id = c.id;
  if (!img || !id) return null;

  const st = c.set ?? {};
  const setId = (st.set_id ?? "").toUpperCase();
  // El apaisado se dice en el nombre de la versión porque cambia lo que sale
  // de la impresora: el arte se para para caber en la hoja, y la carta
  // terminada se sostiene de lado.
  const apaisada = c.orientation === "landscape";
  const textoCarta = aTexto(c.text);

  return {
	uid: armarUid("rift", id),
	juego: "rift",
	nativoId: id,
	name: c.name ?? "?",
	// El nombre agrupa las versiones: la misma carta sale en varios sets
	// (OGN, OPP, promo) y el cliente elige cuál arte quiere.
	grupoId: c.name ?? "",
	set: setId,
	set_name: [st.label ?? setId, apaisada ? "apaisada" : ""]
  	.filter(Boolean)
  	.join(" · "),
	collector_number: String(c.collector_number ?? ""),
	rarity: c.classification?.rarity,
	artist: c.media?.artist,
	// Riftcodex solo publica inglés, y decirlo es más honesto que dejarlo en
	// blanco: el cliente ve en qué idioma le va a llegar.
	idioma: IDIOMA_BASE,
	apaisada,
	imagenes: {
  	small: ancho(img, 240),
  	normal: ancho(img, 480),
  	large: img,
  	print: img,
	},
	ficha: ficha(c),
	texto: textoCarta ? { label: "Texto", value: textoCarta } : undefined,
  };
}

/**
 * Las cartas de una respuesta, sin repetir ilustración.
 *
 * La misma carta sale en varios sets con el MISMO arte: "Jinx - Rebel" son
 * tres entradas (Origins y dos promocionales) que apuntan al mismo archivo de
 * imagen. En una tienda de proxies esa distinción no existe — lo que se compra
 * es la ilustración, y tres miniaturas idénticas en fila parecen un error.
 *
 * De las repetidas se conserva la de la edición normal: la API devuelve las
 * promocionales primero, y "Riftbound Promotional Cards" es una etiqueta más
 * confusa que "Origins" para algo que se imprime idéntico. Un uid que quede
 * fuera igual resuelve por `porId`, así que un pedido viejo que apunte a él
 * sigue funcionando.
 */
function aCartas(items: RiftCard[] | undefined): CartaCatalogo[] {
  const cartas = (items ?? [])
	.map(aCarta)
	.filter((c): c is CartaCatalogo => c !== null);

  // Estable: solo mueve las promocionales al final, sin alterar el resto del
  // orden que trae la API.
  const ordenadas = cartas
	.map((c, i) => ({ c, i, promo: /promotional/i.test(c.set_name) }))
	.sort((a, b) => Number(a.promo) - Number(b.promo) || a.i - b.i)
	.map((x) => x.c);

  const vistas = new Set<string>();
  const unicas = ordenadas.filter((c) => {
	if (vistas.has(c.imagenes.print)) return false;
	vistas.add(c.imagenes.print);
	return true;
  });

  // Devueltas en el orden original: la preferencia de arriba decide cuál
  // sobrevive, no en qué lugar de la grilla aparece.
  return cartas.filter((c) => unicas.includes(c));
}

export const RIFTBOUND: Catalogo = {
  id: "rift",
  nombre: "Riftbound",
  corto: "Riftbound",
  tamano: TAMANO_INGLES,
  placeholder: 'Ej: "Jinx - Rebel", "Poppy"',
  ayuda: "Busca por nombre. El nombre exacto trae todas sus versiones.",
  aviso:
	"Las cartas de Riftbound miden lo mismo que las de Magic y el arte viene " +
	"del CDN de Riot, así que se imprimen igual de bien. Las apaisadas " +
	"(campos de batalla) se imprimen derechas y la carta se sostiene de lado.",
  soportaMpcfill: false,
  // Riftcodex ignora el parámetro de idioma y devuelve siempre lo mismo.
  idiomas: ["en"],

  async buscar(q: string): Promise<ResultadoBusqueda> {
	// Dos llamadas, mezcladas. `exact` devuelve TODAS las versiones de un
	// nombre; `fuzzy` lo cortan en 10 pero pesca lo escrito a medias. El
	// exacto va primero para que un nombre conocido liste su tirada completa
	// antes que los vecinos.
	// En paralelo, no una tras otra.
	//
	// Secuenciales eran dos plazos encadenados, y el límite de una función de
	// Vercel es de diez segundos: bastaba que Riftcodex tardara un poco — está
	// en Railway y despierta frío — para que la búsqueda se pasara y el
	// catálogo saliera vacío en producción mientras andaba bien en local.
	const [exacta, difusa] = await Promise.allSettled([
  	consultar("/cards/name", { exact: q, size: "60" }),
  	consultar("/cards/name", { fuzzy: q, size: "60" }),
	]);

	// Si las dos fallan no hay nada que mostrar y hay que decirlo; si una sola
	// falla, la otra alcanza.
	if (exacta.status === "rejected" && difusa.status === "rejected") {
  	throw exacta.reason;
	}

	// El exacto primero: un nombre conocido lista su tirada completa antes que
	// los vecinos que trae el difuso.
	const vistas = new Set<string>();
	const cartas: CartaCatalogo[] = [];
	for (const r of [exacta, difusa]) {
  	if (r.status !== "fulfilled") continue;
  	for (const carta of aCartas(r.value.items)) {
    	if (vistas.has(carta.uid)) continue;
    	vistas.add(carta.uid);
    	cartas.push(carta);
  	}
	}
	return { cartas, total: cartas.length };
  },

  async porId(nativoId: string) {
	const { ok, data } = await pedirJson<RiftCard>(
  	`${API}/cards/${encodeURIComponent(nativoId)}`,
  	{ headers: HEADERS, revalidate: REVALIDATE }
	);
	return ok && data ? aCarta(data) : null;
  },

  async versiones(carta: CartaCatalogo) {
	const pagina = await consultar("/cards/name", {
  	exact: carta.grupoId,
  	size: String(60),
	});
	return aCartas(pagina.items);
  },

  async aleatorias(n: number) {
	// No tienen endpoint aleatorio (/cards/random responde 500), así que se
	// pide una página al azar del catálogo completo. Cuántas páginas hay se
	// recuerda: preguntarlo cada vez era un viaje extra antes del que importa,
	// y son dos plazos dentro del límite de diez segundos de Vercel.
	if (paginasConocidas === null) {
  	const primera = await consultar("/cards", { size: "1", page: "1" });
  	paginasConocidas = Math.max(
    	1,
    	Math.ceil((primera.total ?? 1) / MAX_POR_PAGINA)
  	);
	}
	const paginas = paginasConocidas;
	const page = 1 + Math.floor(Math.random() * paginas);
	const pagina = await consultar("/cards", {
  	size: String(MAX_POR_PAGINA),
  	page: String(page),
	});
	const cartas = aCartas(pagina.items);
	// Barajadas, o la grilla mostraría siempre las primeras n de esa página.
	for (let i = cartas.length - 1; i > 0; i--) {
  	const j = Math.floor(Math.random() * (i + 1));
  	[cartas[i], cartas[j]] = [cartas[j], cartas[i]];
	}
	return cartas.slice(0, n);
  },

  async autocompletar(q: string) {
	const pagina = await consultar("/cards/name", { fuzzy: q, size: "10" });
	return [...new Set(aCartas(pagina.items).map((c) => c.name))];
  },
};
