/**
 * Catálogo de Pokémon, sobre TCGdex.
 *
 * Se eligió TCGdex y no pokemontcg.io por dos razones que importan acá:
 * **no pide llave**, y **tiene español de verdad** — nombres, rarezas, tipos y
 * textos de ataque traducidos, no solo la interfaz. Para una tienda chilena eso
 * decide: el cliente busca "Charizard" y ve "Rara Doble", "Fuego", "Fase 2".
 *
 * La resolución es la pega del juego: **600×825 es el techo de todo el
 * ecosistema Pokémon**, no una limitación de TCGdex — se midió y pokemontcg.io
 * da exactamente lo mismo. Una carta de 63×88 mm a 1200 DPI necesita
 * 2976×4160, así que acá el upscale trabaja desde casi 5× en vez del 4× de
 * Magic. Se dice en el aviso, no se esconde.
 */

import { TAMANO_INGLES } from "@/lib/formulas";
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

const API = "https://api.tcgdex.net/v2";

const HEADERS = {
  "User-Agent": "VolcanProxies/1.0 (+https://volcanproxies.cl)",
  Accept: "application/json",
};

const REVALIDATE = 3600;

type PkmnBreve = { id: string; localId?: string; name?: string; image?: string };

type PkmnAtaque = {
  name?: string;
  cost?: string[];
  damage?: string | number;
  effect?: string;
};

type PkmnCarta = PkmnBreve & {
  category?: string;
  rarity?: string;
  illustrator?: string;
  hp?: number;
  types?: string[];
  stage?: string;
  evolveFrom?: string;
  retreat?: number;
  weaknesses?: { type?: string; value?: string }[];
  attacks?: PkmnAtaque[];
  effect?: string;
  description?: string;
  set?: { id?: string; name?: string };
};

type PkmnSet = { id: string; name?: string; cards?: PkmnBreve[] };

async function traer<T>(ruta: string): Promise<T | null> {
  const { ok, data } = await pedirJson<T>(`${API}/${ruta}`, {
	headers: HEADERS,
	revalidate: REVALIDATE,
  });
  return ok ? data : null;
}

// --------------------------------------------------------------------------
// Nombres de set
// --------------------------------------------------------------------------
// El resultado de búsqueda no trae el set, y pedir la carta completa de cada
// resultado sería una llamada por miniatura. La lista entera son 154 sets en
// 22 KB, así que se pide una vez por idioma y se guarda.

const setsPorIdioma = new Map<string, Map<string, string>>();

async function nombresDeSet(lang: IdiomaId): Promise<Map<string, string>> {
  const guardado = setsPorIdioma.get(lang);
  if (guardado) return guardado;
  const sets = (await traer<PkmnSet[]>(`${lang}/sets`)) ?? [];
  const mapa = new Map(sets.map((s) => [s.id, s.name ?? s.id]));
  setsPorIdioma.set(lang, mapa);
  return mapa;
}

/** El id de la carta lleva el set adelante: "sv03.5-006" es del set "sv03.5". */
function setDe(id: string): string {
  const corte = id.lastIndexOf("-");
  return corte > 0 ? id.slice(0, corte) : id;
}

// El id de TCGdex es igual en todos los idiomas: el texto y la imagen cambian
// según la ruta. Por eso el idioma va dentro del id nativo — ver `conIdioma`.

// --------------------------------------------------------------------------
// Ficha
// --------------------------------------------------------------------------

function ficha(c: PkmnCarta): CampoFicha[] {
  const campos: CampoFicha[] = [];
  if (c.category) campos.push({ label: "Categoría", value: c.category });
  if (c.types?.length) campos.push({ label: "Tipo", value: c.types.join(" · ") });
  if (typeof c.hp === "number") campos.push({ label: "PV", value: String(c.hp) });
  if (c.stage) {
	campos.push({
  	label: "Etapa",
  	value: c.evolveFrom ? `${c.stage} (evoluciona de ${c.evolveFrom})` : c.stage,
	});
  }
  const debil = (c.weaknesses ?? [])
	.map((w) => [w.type, w.value].filter(Boolean).join(" "))
	.filter(Boolean);
  if (debil.length) campos.push({ label: "Debilidad", value: debil.join(", ") });
  if (typeof c.retreat === "number") {
	campos.push({ label: "Coste de retirada", value: String(c.retreat) });
  }
  return campos;
}

/**
 * La rareza, o nada.
 *
 * Las promocionales traen "Ninguno" como rareza, y mostrar "Ninguno" al lado
 * del número de la carta es ruido: si no tiene rareza, no se dice nada.
 */
function rareza(v: string | undefined): string | undefined {
  if (!v) return undefined;
  return /^(ninguno|ninguna|none)$/i.test(v.trim()) ? undefined : v;
}

/** Los ataques, escritos como se leen en la carta. */
function textoDeCarta(c: PkmnCarta): string {
  const bloques = (c.attacks ?? []).map((a) => {
	const encabezado = [
  	a.name,
  	a.cost?.length ? `(${a.cost.join(" ")})` : "",
  	a.damage !== undefined && a.damage !== "" ? `— ${a.damage}` : "",
	]
  	.filter(Boolean)
  	.join(" ");
	return [encabezado, a.effect].filter(Boolean).join("\n");
  });
  // Entrenadores y energías no tienen ataques: su texto va en otro campo.
  const suelto = c.effect || c.description || "";
  return [suelto, ...bloques].filter(Boolean).join("\n\n").trim();
}

// --------------------------------------------------------------------------

/**
 * Una carta del catálogo.
 *
 * `setName` llega aparte porque el resultado de búsqueda no trae el set: lo
 * pone quien llama, con el mapa cacheado.
 */
function aCarta(
  c: PkmnCarta,
  lang: IdiomaId,
  setName?: string
): CartaCatalogo | null {
  if (!c.image) return null; // hay muchos registros sin arte: serían huecos
  const setId = c.set?.id ?? setDe(c.id);
  const texto = textoDeCarta(c);

  return {
	uid: armarUid("pkmn", conIdioma(lang, c.id)),
	juego: "pkmn",
	nativoId: conIdioma(lang, c.id),
	idioma: lang,
	// `suffix` ("ex", "V", "VMAX") ya viene dentro de `name`: pegarlo otra vez
	// daba "Charizard ex ex".
	name: c.name ?? "?",
	// El nombre agrupa las reimpresiones: el mismo Charizard sale en muchos
	// sets, y lo que el cliente elige es el arte.
	grupoId: c.name ?? "",
	set: setId,
	set_name: c.set?.name ?? setName ?? setId,
	collector_number: c.localId ?? "",
	rarity: rareza(c.rarity),
	artist: c.illustrator,
	imagenes: {
  	// webp para mirar, png para imprimir: mismos píxeles, 86 KB contra 887.
  	small: `${c.image}/low.webp`,
  	normal: `${c.image}/low.webp`,
  	large: `${c.image}/high.webp`,
  	print: `${c.image}/high.png`,
	},
	ficha: ficha(c),
	texto: texto ? { label: "Texto", value: texto } : undefined,
  };
}

/**
 * Tope de resultados.
 *
 * TCGdex no acota nada: buscar "a" devuelve 9.181 cartas, y con eso viaja un
 * JSON enorme para una grilla que nadie va a recorrer entera. Los otros
 * catálogos ya vienen acotados por su API (Scryfall pagina, YGOPRODeck y
 * Riftcodex aceptan un límite); este es el único que hay que frenar acá.
 */
const MAX_RESULTADOS = 60;

async function buscarEn(q: string, lang: IdiomaId): Promise<CartaCatalogo[]> {
  const breves =
	(await traer<PkmnBreve[]>(
  	`${lang}/cards?name=${encodeURIComponent(`like:${q}`)}`
	)) ?? [];
  if (!breves.length) return [];
  const sets = await nombresDeSet(lang);
  return breves
	.map((c) => aCarta(c, lang, sets.get(setDe(c.id))))
	.filter((c): c is CartaCatalogo => c !== null)
	.slice(0, MAX_RESULTADOS);
}

export const POKEMON: Catalogo = {
  id: "pkmn",
  nombre: "Pokémon",
  corto: "Pokémon",
  tamano: TAMANO_INGLES,
  placeholder: 'Ej: "Charizard", "Pikachu", "Investigación"',
  ayuda: "Busca por nombre, en español o en inglés.",
  // La contra dicha en voz alta, igual que la de cada acabado: es lo que hace
  // creíble el resto. 600×825 es el techo de TODO el ecosistema Pokémon, no de
  // esta fuente, y está bajo lo que pide una carta a 1200 DPI.
  aviso:
	"El arte de Pokémon existe a 600×825 como máximo en todos lados — algo " +
	"menos que el de Magic. Se imprime bien, pero con un poco menos de " +
	"detalle fino.",
  soportaMpcfill: false,
  // Seis. El japonés no existe en TCGdex: la ruta responde 404, no devuelve
  // la carta en inglés.
  idiomas: ["en", "es", "pt", "de", "fr", "it"],

  async buscar(q: string, idioma: IdiomaId): Promise<ResultadoBusqueda> {
	let cartas = await buscarEn(q, idioma);
	if (!cartas.length && idioma !== IDIOMA_BASE) {
  	// Los entrenadores y las energías cambian de nombre entre idiomas, así
  	// que quien escriba el nombre en inglés igual encuentra su carta — y la
  	// carta que vuelve dice que es inglesa, no finge estar traducida.
  	cartas = await buscarEn(q, IDIOMA_BASE);
	}
	return { cartas, total: cartas.length };
  },

  async porId(nativoId: string) {
	const { idioma, id } = sinIdioma(nativoId);
	const carta = await traer<PkmnCarta>(`${idioma}/cards/${id}`);
	return carta ? aCarta(carta, idioma) : null;
  },

  async versiones(carta: CartaCatalogo) {
	const todas = await buscarEn(carta.grupoId, carta.idioma);
	// `like:` busca por trozo, así que "Charizard" también trae "Charizard ex".
	// Para elegir arte solo sirve la misma carta.
	return todas.filter((c) => c.grupoId === carta.grupoId);
  },

  async aleatorias(n: number, idioma: IdiomaId) {
	// No publican un endpoint aleatorio, y pedir el catálogo entero serían
	// decenas de miles de registros. Un set al azar es una sola llamada más.
	const sets = await nombresDeSet(idioma);
	const ids = [...sets.keys()];
	if (!ids.length) return [];

	// Varios sets del listado vienen vacíos (`bwp` es uno), así que se
	// reintenta: sin esto la portada del catálogo salía en blanco cada vez
	// que el azar caía en uno de ellos.
	for (let intento = 0; intento < 4; intento++) {
  	const setId = ids[Math.floor(Math.random() * ids.length)];
  	const set = await traer<PkmnSet>(`${idioma}/sets/${setId}`);
  	const cartas = (set?.cards ?? [])
    	.map((c) => aCarta(c, idioma, set?.name))
    	.filter((c): c is CartaCatalogo => c !== null);
  	if (!cartas.length) continue;
  	for (let i = cartas.length - 1; i > 0; i--) {
    	const j = Math.floor(Math.random() * (i + 1));
    	[cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  	}
  	return cartas.slice(0, n);
	}
	return [];
  },

  async autocompletar(q: string, idioma: IdiomaId) {
	const cartas = await buscarEn(q, idioma);
	return [...new Set(cartas.map((c) => c.name))].slice(0, 10);
  },
};
