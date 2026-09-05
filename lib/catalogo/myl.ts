/**
 * Catálogo de Mitos y Leyendas, sobre API TCG (apitcg.com).
 *
 * Es el juego chileno, y de los cuatro que vende API TCG con calidad decente
 * es **el mejor de todos**: 709×1016 en PNG, prácticamente empatado con
 * Scryfall (745×1040) y muy por encima de Pokémon. Medido sobre varias cartas,
 * no sobre una.
 *
 * **Pide llave**, y eso acá no es problema: vive en `APITCG_KEY`, una variable
 * de entorno del servidor. Era el motivo por el que Cardwright no podía usar
 * esta fuente — un binario que se reparte no puede guardar una llave — y es un
 * buen ejemplo de que las restricciones de una y otra app no son las mismas.
 *
 * Las imágenes salen del servidor oficial de MyL (`api.myl.cl`); API TCG solo
 * indexa los datos. Ver `imagenes()` para lo que eso obliga a hacer.
 */

import { TAMANO_JAPONES } from "@/lib/formulas";
import { pedirJson } from "./http";
import {
  armarUid,
  type Catalogo,
  type CampoFicha,
  type CartaCatalogo,
  type ResultadoBusqueda,
} from "./tipos";

const API = "https://api.apitcg.com/api";
const TCG = "mitos-y-leyendas";
const REVALIDATE = 3600;

/** Lo que trae una búsqueda antes de cortar. */
const MAX_RESULTADOS = 60;

type MylAtributos = {
  type?: string;
  race?: string;
  rarity?: string;
  cost?: string;
  strength?: string;
  ability?: string;
  format?: string;
};

type MylCarta = {
  _id?: number | string;
  name?: string;
  code?: string;
  cardNumber?: string;
  set?: { name?: string; slug?: string; code?: string };
  attributes?: MylAtributos;
  images?: { small?: string; medium?: string; large?: string }[];
};

type MylRespuesta = { success?: boolean; data?: MylCarta[]; total?: number };

function cabeceras(): Record<string, string> {
  return {
	"x-api-key": process.env.APITCG_KEY ?? "",
	Accept: "application/json",
	"User-Agent": "VolcanProxies/1.0 (+https://volcanproxies.cl)",
  };
}

async function consultar(params: Record<string, string>): Promise<MylRespuesta> {
  if (!process.env.APITCG_KEY) {
	// Decirlo en vez de devolver vacío: sin la llave el catálogo aparece
	// vacío y eso es indistinguible de "no hay resultados".
	throw new Error("Falta APITCG_KEY en el entorno");
  }
  const qs = new URLSearchParams({ tcg: TCG, ...params }).toString();
  const { ok, status, data } = await pedirJson<MylRespuesta>(
	`${API}/products?${qs}`,
	{ headers: cabeceras(), revalidate: REVALIDATE }
  );
  if (!ok) throw new Error(`API TCG ${status}`);
  return data ?? {};
}

/**
 * Los nombres llegan todos en minúscula ("amor de zeus", "11 custodio").
 *
 * Se capitalizan para mostrar, pero en castellano las preposiciones y los
 * artículos van en minúscula: es "Amor de Zeus", no "Amor De Zeus". La primera
 * palabra siempre lleva mayúscula, aunque sea una de esas.
 */
const MINUSCULAS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u",
  "a", "al", "en", "con", "por", "para", "un", "una", "sin",
]);

function titular(nombre: string): string {
  return nombre
	.split(" ")
	.map((palabra, i) => {
  	if (!palabra) return palabra;
  	if (i > 0 && MINUSCULAS.has(palabra.toLowerCase())) return palabra.toLowerCase();
  	return palabra.charAt(0).toUpperCase() + palabra.slice(1);
	})
	.join(" ");
}

/**
 * Las cuatro tallas, sabiendo que la fuente publica una sola.
 *
 * MyL sirve el mismo PNG de ~1,9 MB en `small`, `medium` y `large`. Sesenta de
 * esos en una grilla son 114 MB, así que las de pantalla pasan por el
 * optimizador de Next, que las achica y las cachea — y de paso evita que el
 * navegador de cada visitante golpee el servidor de MyL.
 *
 * La de impresión va sin tocar: es la buena y es la que se manda a producir.
 */
function imagenes(url: string) {
  // q=75 y no otra: Next 16 solo sirve las calidades configuradas en
  // `images.qualities`, y 75 es la única por defecto. Con 80 responde 400.
  const chica = (w: number) =>
	`/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=75`;
  return {
	small: chica(256),
	normal: chica(384),
	large: chica(750),
	print: url,
  };
}

function ficha(a: MylAtributos): CampoFicha[] {
  const campos: CampoFicha[] = [];
  if (a.type) campos.push({ label: "Tipo", value: a.type });
  if (a.race) campos.push({ label: "Raza", value: a.race });
  if (a.cost) campos.push({ label: "Coste", value: a.cost });
  if (a.strength) campos.push({ label: "Fuerza", value: a.strength });
  if (a.format) campos.push({ label: "Formato", value: a.format });
  return campos;
}

function aCarta(c: MylCarta): CartaCatalogo | null {
  const url = c.images?.[0]?.large || c.images?.[0]?.medium || c.images?.[0]?.small;
  const id = c._id;
  if (!url || id === undefined) return null;

  const a = c.attributes ?? {};
  const nombre = titular(c.name ?? "?");

  return {
	uid: armarUid("myl", String(id)),
	juego: "myl",
	nativoId: String(id),
	name: nombre,
	// El nombre agrupa las reimpresiones: la misma carta sale en varias
	// ediciones y lo que el cliente elige es el arte.
	grupoId: nombre,
	set: c.set?.code ?? c.set?.slug ?? "",
	set_name: c.set?.name ?? "",
	collector_number: c.cardNumber ?? c.code ?? "",
	rarity: a.rarity,
	// La fuente es chilena y solo publica español.
	idioma: "es",
	imagenes: imagenes(url),
	ficha: ficha(a),
	texto: a.ability ? { label: "Habilidad", value: a.ability } : undefined,
  };
}

function aCartas(cards: MylCarta[] | undefined): CartaCatalogo[] {
  return (cards ?? [])
	.map(aCarta)
	.filter((c): c is CartaCatalogo => c !== null);
}

export const MYL: Catalogo = {
  id: "myl",
  nombre: "Mitos y Leyendas",
  corto: "Mitos y Leyendas",
  tamano: TAMANO_JAPONES,
  placeholder: 'Ej: "Amor de Zeus", "dragón"',
  ayuda: "Busca por nombre. Son casi 20.000 cartas, así que conviene ser específico.",
  // Solo español: es un juego chileno y su fuente no publica otra cosa.
  idiomas: ["es"],
  soportaMpcfill: false,

  async buscar(q: string): Promise<ResultadoBusqueda> {
	const d = await consultar({ name: q, limit: String(MAX_RESULTADOS) });
	return { cartas: aCartas(d.data), total: d.total ?? 0 };
  },

  async porId(nativoId: string) {
	const { ok, data } = await pedirJson<{ data?: MylCarta }>(
  	`${API}/products/${encodeURIComponent(nativoId)}`,
  	{ headers: cabeceras(), revalidate: REVALIDATE }
	);
	return ok && data?.data ? aCarta(data.data) : null;
  },

  async versiones(carta: CartaCatalogo) {
	// `name` busca por trozo, así que hay que quedarse con las que se llaman
	// igual: "Zeus" trae también "Amor de Zeus".
	const d = await consultar({ name: carta.grupoId, limit: "60" });
	return aCartas(d.data).filter((c) => c.grupoId === carta.grupoId);
  },

  async aleatorias(n: number) {
	// No hay endpoint aleatorio. Con casi 20.000 cartas, una página al azar
	// del catálogo alcanza de sobra para una grilla de novedades.
	const porPagina = 40;
	const primera = await consultar({ limit: "1" });
	const paginas = Math.max(1, Math.ceil((primera.total ?? 1) / porPagina));
	const page = 1 + Math.floor(Math.random() * paginas);
	const d = await consultar({ limit: String(porPagina), page: String(page) });
	const cartas = aCartas(d.data);
	for (let i = cartas.length - 1; i > 0; i--) {
  	const j = Math.floor(Math.random() * (i + 1));
  	[cartas[i], cartas[j]] = [cartas[j], cartas[i]];
	}
	return cartas.slice(0, n);
  },

  async autocompletar(q: string) {
	const d = await consultar({ name: q, limit: "12" });
	return [...new Set(aCartas(d.data).map((c) => c.name))].slice(0, 10);
  },
};
