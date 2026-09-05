/**
 * Catálogo de Riftbound (el TCG de League of Legends), desde nuestra base.
 *
 * Los datos vienen de Riftcodex, pero NO en vivo: **Riftcodex responde 403 a
 * los servidores de Vercel**. Está detrás de Cloudflare y bloquea el tráfico
 * de datacenter, así que desde una IP residencial anda perfecto y desde el
 * sitio no. Por eso las cartas se copian a Supabase corriendo
 * `node scripts/sync-riftbound.mjs` desde la máquina de Seba, y acá se leen de
 * ahí.
 *
 * Lo que se guarda es la carta CRUDA de Riftcodex, así que la conversión de
 * abajo es la misma de antes y cualquier arreglo en ella vale para lo ya
 * guardado sin resincronizar.
 *
 * Las imágenes no pasan por esto: son del CDN de Riot (744×1039, la misma
 * clase que Scryfall) y las carga el navegador del cliente directo.
 *
 * El CDN es Sanity y redimensiona por parámetro, así que la miniatura es un
 * `?w=`. **Solo hacia abajo**: pedirle 3000 de ancho devuelve una imagen de
 * 3000 px interpolada desde las 744 originales, o sea nitidez falsa.
 */

import { TAMANO_INGLES } from "@/lib/formulas";
import { supabase } from "@/lib/supabase";
import { IDIOMA_BASE } from "./idiomas";
import {
  armarUid,
  type Catalogo,
  type CampoFicha,
  type CartaCatalogo,
  type ResultadoBusqueda,
} from "./tipos";

/** Cuántas cartas trae una búsqueda antes de cortar. */
const MAX_RESULTADOS = 60;

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

type Fila = { datos: RiftCard };

const TABLA = "riftbound_cartas";

/** Sin tildes ni mayúsculas, igual que lo que guarda la sincronización. */
function normalizar(v: string): string {
  return v
	.normalize("NFD")
	.replace(/[̀-ͯ]/g, "")
	.toLowerCase()
	.trim();
}

/**
 * Las cartas de una consulta.
 *
 * Un error de Supabase se propaga en vez de devolver vacío: "no hay cartas" y
 * "la base no contestó" son cosas distintas, y confundirlas fue justo lo que
 * hizo difícil ver por qué Riftbound salía en blanco en producción.
 */
async function filas(
  construir: (q: ReturnType<typeof consulta>) => PromiseLike<{
	data: Fila[] | null;
	error: { message: string } | null;
  }>
): Promise<RiftCard[]> {
  const { data, error } = await construir(consulta());
  if (error) throw new Error(`Base de Riftbound: ${error.message}`);
  return (data ?? []).map((f) => f.datos);
}

function consulta() {
  return supabase.from(TABLA).select("datos");
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
	const texto = normalizar(q);
	if (!texto) return { cartas: [], total: 0 };
	const cards = await filas((c) =>
  	c.ilike("nombre_busqueda", `%${texto}%`).limit(MAX_RESULTADOS * 3)
	);
	// El orden lo pone la base, que es el de inserción: sin esto, buscar
	// "Poppy" mostraba "Poppy - Paragon (Alternate Art)" antes que la carta
	// normal, y "Jinx" empezaba por una variante numerada.
	//
	// Tres criterios, en orden: la coincidencia exacta manda, después la carta
	// base antes que sus variantes —"(Alternate Art)", "(Overnumbered)",
	// "(Signature)" van entre paréntesis— y al final alfabético para que dos
	// búsquedas iguales devuelvan lo mismo.
	const variante = (n: string) => (/\(.*\)\s*$/.test(n) ? 1 : 0);
	cards.sort((a, b) => {
  	const na = a.name ?? "";
  	const nb = b.name ?? "";
  	const exacta =
    	(normalizar(na) === texto ? 0 : 1) - (normalizar(nb) === texto ? 0 : 1);
  	if (exacta !== 0) return exacta;
  	const v = variante(na) - variante(nb);
  	if (v !== 0) return v;
  	return na.localeCompare(nb, "es");
	});
	const cartas = aCartas(cards).slice(0, MAX_RESULTADOS);
	return { cartas, total: cartas.length };
  },

  async porId(nativoId: string) {
	const cards = await filas((c) => c.eq("id", nativoId).limit(1));
	return cards.length ? aCarta(cards[0]) : null;
  },

  async versiones(carta: CartaCatalogo) {
	const cards = await filas((c) =>
  	c.eq("nombre_busqueda", normalizar(carta.grupoId)).limit(60)
	);
	return aCartas(cards);
  },

  async aleatorias(n: number) {
	// Supabase no ordena al azar, así que se toma una ventana en una posición
	// cualquiera y se baraja. Con ~1.450 cartas alcanza y sobra.
	const { count, error } = await supabase
  	.from(TABLA)
  	.select("id", { count: "exact", head: true });
	if (error) throw new Error(`Base de Riftbound: ${error.message}`);
	const total = count ?? 0;
	if (!total) return [];

	const ventana = Math.min(total, Math.max(n * 4, 40));
	const desde = Math.floor(Math.random() * Math.max(1, total - ventana));
	const cards = await filas((c) => c.range(desde, desde + ventana - 1));

	const cartas = aCartas(cards);
	for (let i = cartas.length - 1; i > 0; i--) {
  	const j = Math.floor(Math.random() * (i + 1));
  	[cartas[i], cartas[j]] = [cartas[j], cartas[i]];
	}
	return cartas.slice(0, n);
  },

  async autocompletar(q: string) {
	const texto = normalizar(q);
	if (!texto) return [];
	const cards = await filas((c) =>
  	c.ilike("nombre_busqueda", `%${texto}%`).limit(20)
	);
	return [...new Set(cards.map((c) => c.name ?? ""))].filter(Boolean).slice(0, 10);
  },
};
