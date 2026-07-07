const BASE = "https://api.scryfall.com";

const headers = {
  "User-Agent": "VolcanProxies/1.0",
  Accept: "application/json",
};

export type ScryfallCard = {
  id: string;
  oracle_id: string;
  name: string;
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
	const res = await fetch(url, { headers, next: { revalidate: 3600 } });
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
  	{ headers, next: { revalidate: 3600 } }
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
  	next: { revalidate: 3600 },
	});
	if (!res.ok) return [];
	const json = await res.json();
	return json.data ?? [];
  } catch {
	return [];
  }
}

export async function getRandomCards(count: number = 10): Promise<ScryfallCard[]> {
  const promises = Array.from({ length: count }, async () => {
	try {
  	const res = await fetch(`${BASE}/cards/random`, {
    	headers,
    	cache: "no-store",
  	});
  	if (!res.ok) return null;
  	return await res.json();
	} catch {
  	return null;
	}
  });
  const results = await Promise.all(promises);
  return results.filter((c): c is ScryfallCard => c !== null);
}

export async function autocomplete(q: string): Promise<string[]> {
  if (!q.trim() || q.length < 2) return [];
  try {
	const res = await fetch(
  	`${BASE}/cards/autocomplete?q=${encodeURIComponent(q)}`,
  	{ headers }
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
  size: "small" | "normal" | "large" = "normal"
): string {
  if (card.image_uris) return card.image_uris[size];
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size];
  return "/placeholder-card.png";
}

