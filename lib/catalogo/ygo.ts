/**
 * Catálogo de Yu-Gi-Oh!, sobre la API de YGOPRODeck.
 *
 * Dos condiciones de su servicio mandan sobre este archivo:
 *
 *  - **No hotlinkear las imágenes.** Piden explícitamente descargarlas y
 *    servirlas uno mismo en vez de apuntar a su CDN desde cada visita. Por eso
 *    todas las imágenes salen por `/api/imagen-carta`, que las trae una vez y
 *    las deja cacheadas en el CDN nuestro.
 *  - **20 consultas por segundo.** Nada acá dispara ráfagas: la búsqueda es
 *    una llamada, las aleatorias son una llamada, y las respuestas se cachean
 *    una hora en `/api/catalogo`.
 *
 * A diferencia de Magic, una carta no tiene "impresiones" sino **artes**: el
 * mismo Dark Magician existe con nueve ilustraciones distintas, cada una con
 * su propio código. El arte es lo que se imprime, así que el uid apunta al
 * arte y el nombre es lo que agrupa las versiones.
 */

import { TAMANO_JAPONES } from "@/lib/formulas";
import { pedirJson } from "./http";
import {
  conIdioma,
  IDIOMA_BASE,
  sinIdioma,
  type IdiomaId,
} from "./idiomas";
import {
  armarUid,
  type Catalogo,
  type CampoFicha,
  type CartaCatalogo,
  type ResultadoBusqueda,
} from "./tipos";

const API = "https://db.ygoprodeck.com/api/v7/cardinfo.php";

/**
 * Nos identificamos con el sitio real. Un User-Agent genérico es lo primero
 * que bloquea cualquier API cuando algo se le va de las manos, y así saben a
 * quién escribirle antes de cortar.
 */
const HEADERS = {
  "User-Agent": "VolcanProxies/1.0 (+https://volcanproxies.cl)",
  Accept: "application/json",
};

/** Una hora, igual que el resto del catálogo. */
const REVALIDATE = 3600;

/**
 * El parámetro de idioma que entiende su API.
 *
 * Su propio error lo enumera: acepta 'fr', 'de', 'it' y 'pt'. El inglés es lo
 * que devuelve sin parámetro, y el español simplemente no lo tienen.
 */
function paramIdioma(idioma: IdiomaId): Record<string, string> {
  return idioma === IDIOMA_BASE ? {} : { language: idioma };
}

type YgoSet = { set_name?: string; set_code?: string };
type YgoImage = { id: number; image_url: string; image_url_small: string };
type YgoCard = {
  id: number;
  name: string;
  type?: string;
  humanReadableCardType?: string;
  desc?: string;
  race?: string;
  attribute?: string;
  level?: number;
  linkval?: number;
  atk?: number;
  def?: number;
  archetype?: string;
  card_sets?: YgoSet[];
  card_images?: YgoImage[];
};

async function consultar(params: Record<string, string>): Promise<YgoCard[]> {
  const qs = new URLSearchParams(params).toString();
  const { ok, status, data } = await pedirJson<{ data?: YgoCard[] }>(
	`${API}?${qs}`,
	{ headers: HEADERS, revalidate: REVALIDATE }
  );
  // 400 es su forma de decir "no hay coincidencias", no una falla.
  if (status === 400) return [];
  if (!ok) throw new Error(`YGOPRODeck ${status}`);
  return data?.data ?? [];
}

/**
 * La URL por la que sale una imagen suya: nunca la de ellos directamente.
 * Ver el comentario de arriba sobre hotlinking.
 */
function porNuestroServidor(url: string): string {
  return `/api/imagen-carta?u=${encodeURIComponent(url)}`;
}

function ficha(c: YgoCard): CampoFicha[] {
  const campos: CampoFicha[] = [];
  const tipo = c.humanReadableCardType || c.type;
  if (tipo) campos.push({ label: "Tipo", value: tipo });
  if (c.race) campos.push({ label: "Clase", value: c.race });
  if (c.attribute) campos.push({ label: "Atributo", value: c.attribute });
  if (typeof c.level === "number") {
	campos.push({ label: "Nivel", value: String(c.level) });
  } else if (typeof c.linkval === "number") {
	campos.push({ label: "Link", value: String(c.linkval) });
  }
  if (typeof c.atk === "number") {
	campos.push({ label: "ATK/DEF", value: `${c.atk}/${c.def ?? "—"}` });
  }
  if (c.archetype) campos.push({ label: "Arquetipo", value: c.archetype });
  return campos;
}

/**
 * Una carta por cada arte.
 *
 * `idx` numera el arte dentro de la carta y se usa como número de coleccionista:
 * Yu-Gi-Oh no tiene uno, y saber que salió el arte 3 de 9 es justo lo que hace
 * falta al producir para no imprimir la ilustración equivocada.
 */
function aCartas(c: YgoCard, idioma: IdiomaId): CartaCatalogo[] {
  const sets = c.card_sets ?? [];
  const set = sets[0]?.set_code ?? "";
  const setName = sets[0]?.set_name ?? c.humanReadableCardType ?? "Yu-Gi-Oh!";
  const campos = ficha(c);
  const imagenes = c.card_images ?? [];

  return imagenes.map((img, idx) => ({
	uid: armarUid("ygo", conIdioma(idioma, String(img.id))),
	juego: "ygo" as const,
	nativoId: conIdioma(idioma, String(img.id)),
	idioma,
	name: c.name,
	// El nombre agrupa los artes: pedir la carta por nombre es lo único que
	// devuelve todas sus ilustraciones de una vez.
	grupoId: c.name,
	set,
	set_name:
  	imagenes.length > 1 ? `${setName} · arte ${idx + 1}/${imagenes.length}` : setName,
	collector_number: String(idx + 1),
	// Solo publican dos tamaños: 168×246 y 813×1185. La grande queda para el
	// detalle, que es donde el cliente mira el arte antes de comprar; la
	// grilla usa la chica o una búsqueda serían 29 imágenes de 150 KB.
	imagenes: {
  	small: porNuestroServidor(img.image_url_small),
  	normal: porNuestroServidor(img.image_url_small),
  	large: porNuestroServidor(img.image_url),
  	print: porNuestroServidor(img.image_url),
	},
	ficha: campos,
	texto: c.desc ? { label: "Texto", value: c.desc } : undefined,
  }));
}

export const YGO: Catalogo = {
  id: "ygo",
  nombre: "Yu-Gi-Oh!",
  corto: "Yu-Gi-Oh!",
  tamano: TAMANO_JAPONES,
  placeholder: 'Ej: "Dark Magician", "Blue-Eyes"',
  ayuda: "Busca por nombre. Cada carta muestra todos sus artes.",
  // Se dice acá y no en la letra chica: la carta sale más chica que una de
  // Magic porque así es una carta de Yu-Gi-Oh, no porque se recortó.
  aviso:
	"Las cartas de Yu-Gi-Oh se imprimen en su tamaño real (59 × 86 mm), más " +
	"chicas que las de Magic. Mismo precio por carta.",
  soportaMpcfill: false,
  // Su propio error lo enumera: "This API accepts the following language
  // values: 'fr', 'de', 'it' or 'pt'". Más el inglés por defecto. Sin
  // español, que es el que más se pediría acá.
  idiomas: ["en", "pt", "de", "fr", "it"],

  async buscar(q: string, idioma: IdiomaId): Promise<ResultadoBusqueda> {
	// `num` acota lo que devuelven: sin él, "dragon" trae miles de cartas y
	// cada una con todos sus artes.
	const base = { fname: q, num: "40", offset: "0" };
	let cards = await consultar({ ...base, ...paramIdioma(idioma) });
	let entregado = idioma;
	if (!cards.length && idioma !== IDIOMA_BASE) {
  	// Su base en otro idioma tiene los nombres traducidos, así que el
  	// nombre en inglés no encuentra nada ahí. Se reintenta en inglés y la
  	// carta dice que es inglesa.
  	cards = await consultar(base);
  	entregado = IDIOMA_BASE;
	}
	const cartas = cards.flatMap((c) => aCartas(c, entregado));
	return { cartas, total: cartas.length };
  },

  async porId(nativoId: string) {
	const { idioma, id: artId } = sinIdioma(nativoId);
	// Preguntar por el código de un arte devuelve la carta con ese arte solo.
	// Sirve para saber de qué carta se trata, pero no para numerar el arte:
	// aislado siempre parecería el primero, y el panel terminaría diciendo
	// "arte 1" de una carta que tiene nueve. Con el nombre vuelven todos y el
	// número que se muestra es el de verdad.
	const [suelta] = await consultar({ id: artId, ...paramIdioma(idioma) });
	if (!suelta) return null;

	const completa = await consultar({
  	name: suelta.name,
  	...paramIdioma(idioma),
	});
	const todas = completa.flatMap((c) => aCartas(c, idioma));
	return (
  	todas.find((c) => c.nativoId === nativoId) ??
  	aCartas(suelta, idioma)[0] ??
  	null
	);
  },

  async versiones(carta: CartaCatalogo) {
	const cards = await consultar({
  	name: carta.grupoId,
  	...paramIdioma(carta.idioma),
	});
	return cards.flatMap((c) => aCartas(c, carta.idioma));
  },

  async aleatorias(n: number, idioma: IdiomaId) {
	// Una sola llamada trae las n, a diferencia de Scryfall que pide una por
	// carta. `cachebust` es lo que su propio /randomcard agrega al redirigir.
	const cards = await consultar({
  	num: String(n),
  	offset: "0",
  	sort: "random",
  	cachebust: String(Date.now()),
  	...paramIdioma(idioma),
	});
	// Un arte por carta: la grilla aleatoria muestra variedad de cartas, no
	// nueve versiones del mismo Dark Magician.
	return cards.flatMap((c) => aCartas(c, idioma).slice(0, 1));
  },

  async autocompletar(q: string, idioma: IdiomaId) {
	// No tienen endpoint de autocompletado; los nombres salen de la búsqueda.
	const cards = await consultar({
  	fname: q,
  	num: "10",
  	offset: "0",
  	...paramIdioma(idioma),
	});
	return [...new Set(cards.map((c) => c.name))];
  },
};
