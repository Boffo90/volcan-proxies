import { TIMEOUT_MS } from "./catalogo/http";

const BASE = "https://api.scryfall.com";

/**
* Plazo para cada llamada.
*
* Scryfall contesta en menos de un segundo cuando está sano, pero una API que
* deja de responder sin cerrar la conexión cuelga la petición hasta que Vercel
* corta la función. Pasó de verdad con otra API el 4-sep-2026.
*/
const corte = () => AbortSignal.timeout(TIMEOUT_MS);

const headers = {
  "User-Agent": "VolcanProxies/1.0",
  Accept: "application/json",
};

export type ScryfallCard = {
  id: string;
  oracle_id: string;
  name: string;
  /**
  * El nombre impreso en la carta cuando no es inglesa. Scryfall guarda el
  * nombre en inglés en `name` siempre, y el traducido acá.
  */
  printed_name?: string;
  printed_type_line?: string;
  printed_text?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  colors?: string[];
  color_identity?: string[];
  rarity: string;
  /**
  * Qué tan buena es la imagen: "highres_scan", "lowres", "placeholder" o
  * "missing". Los dos últimos NO son la carta — son un cartel que dice que la
  * imagen no está.
  */
  image_status?: string;
  set: string;
  set_name: string;
  collector_number: string;
  artist?: string;
  image_uris?: {
	small: string;
	normal: string;
	large: string;
	png: string;
	art_crop: string;
	border_crop: string;
  };
  card_faces?: Array<{
	name: string;
	printed_name?: string;
	printed_type_line?: string;
	printed_text?: string;
	mana_cost?: string;
	type_line?: string;
	oracle_text?: string;
	power?: string;
	toughness?: string;
	image_uris?: ScryfallCard["image_uris"];
  }>;
  prices?: { usd?: string | null; usd_foil?: string | null };
  scryfall_uri: string;
  released_at: string;
  lang: string;
};

export type ScryfallSymbol = {
  symbol: string;
  svg_uri: string;
  english: string;
};

export type ScryfallRuling = {
  published_at: string;
  comment: string;
};

type SearchResponse = {
  object: "list";
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
};

export async function searchCards(
  query: string,
  page: number = 1
): Promise<SearchResponse | null> {
  if (!query.trim()) return null;

  // Si la query no usa operadores Scryfall (t:, c:, set:, name:, etc.),
  // dividimos las palabras y buscamos cada una con name: para permitir
  // cualquier orden ("Bolt Lightning" encuentra Lightning Bolt).
  const hasOperators = /[a-z]+:/i.test(query);
  let finalQuery = query;

  if (!hasOperators) {
	const words = query.trim().split(/\s+/).filter(Boolean);
	if (words.length > 1) {
  	finalQuery = words.map((w) => `name:${w}`).join(" ");
	}
  }

  const url = `${BASE}/cards/search?q=${encodeURIComponent(
	finalQuery
  )}&page=${page}&unique=cards&order=name`;

  try {
	const res = await fetch(url, { headers, signal: corte(), next: { revalidate: 3600 } });
	if (res.status === 404)
  	return { object: "list", total_cards: 0, has_more: false, data: [] };
	if (!res.ok) throw new Error(`Scryfall ${res.status}`);
	return await res.json();
  } catch (err) {
	console.error("Scryfall searchCards error:", err);
	return null;
  }
}

export async function getCardById(id: string): Promise<ScryfallCard | null> {
  try {
	const res = await fetch(`${BASE}/cards/${id}`, {
  	headers,
  	signal: corte(),
  	next: { revalidate: 3600 },
	});
	if (!res.ok) return null;
	return await res.json();
  } catch {
	return null;
  }
}

export async function getAllPrints(oracleId: string): Promise<ScryfallCard[]> {
  try {
	const res = await fetch(
  	`${BASE}/cards/search?q=oracleid%3A${oracleId}&unique=prints&order=released`,
  	{ headers, signal: corte(), next: { revalidate: 3600 } }
	);
	if (!res.ok) return [];
	const json: SearchResponse = await res.json();
	return json.data;
  } catch {
	return [];
  }
}

export async function getRulings(cardId: string): Promise<ScryfallRuling[]> {
  try {
	const res = await fetch(`${BASE}/cards/${cardId}/rulings`, {
  	headers,
  	signal: corte(),
  	next: { revalidate: 3600 },
	});
	if (!res.ok) return [];
	const json = await res.json();
	return json.data ?? [];
  } catch {
	return [];
  }
}

/**
* Una impresión concreta en otro idioma.
*
* Es la ruta que Scryfall expone para esto: `/cards/{set}/{number}/{lang}`.
* Devuelve null si esa carta no salió en ese idioma, que es lo normal en
* promos y sets suplementarios.
*/
export async function getPrintingInLanguage(
  set: string,
  collectorNumber: string,
  lang: string
): Promise<ScryfallCard | null> {
  try {
	const res = await fetch(
  	`${BASE}/cards/${encodeURIComponent(set)}/${encodeURIComponent(
    	collectorNumber
  	)}/${encodeURIComponent(lang)}`,
  	{ headers, signal: corte(), next: { revalidate: 3600 } }
	);
	if (!res.ok) return null;
	return await res.json();
  } catch {
	return null;
  }
}

export async function autocomplete(q: string): Promise<string[]> {
  if (!q.trim() || q.length < 2) return [];
  try {
	const res = await fetch(
  	`${BASE}/cards/autocomplete?q=${encodeURIComponent(q)}`,
  	{ headers, signal: corte() }
	);
	if (!res.ok) return [];
	const json = await res.json();
	return json.data ?? [];
  } catch {
	return [];
  }
}

export async function getSymbology(): Promise<ScryfallSymbol[]> {
  try {
	const res = await fetch(`${BASE}/symbology`, {
  	headers,
  	signal: corte(),
  	next: { revalidate: 86400 },
	});
	if (!res.ok) return [];
	const json = await res.json();
	return json.data ?? [];
  } catch {
	return [];
  }
}

export function getCardImage(
  card: ScryfallCard,
  size: "small" | "normal" | "large" | "png" = "normal"
): string {
  if (card.image_uris) return card.image_uris[size];
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size];
  return "/placeholder-card.png";
}

