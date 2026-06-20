// lib/scryfall.ts
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
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
  };
  scryfall_uri: string;
  released_at: string;
  lang: string;
};

type SearchResponse = {
  object: "list";
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
};

/**
 * Busca cartas en Scryfall.
 * Query syntax: https://scryfall.com/docs/syntax
 * Ej: "lightning bolt", "t:creature c:r", "set:dom"
 */
export async function searchCards(
  query: string,
  page: number = 1
): Promise<SearchResponse | null> {
  if (!query.trim()) return null;

  const url = `${BASE}/cards/search?q=${encodeURIComponent(
    query
  )}&page=${page}&unique=cards&order=name`;

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 3600 }, // cache 1h
    });

    if (res.status === 404) {
      return { object: "list", total_cards: 0, has_more: false, data: [] };
    }
    if (!res.ok) throw new Error(`Scryfall ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Scryfall searchCards error:", err);
    return null;
  }
}

/** Obtiene una carta por su ID Scryfall */
export async function getCardById(id: string): Promise<ScryfallCard | null> {
  try {
    const res = await fetch(`${BASE}/cards/${id}`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Scryfall getCardById error:", err);
    return null;
  }
}

/** Obtiene TODOS los prints de una carta (diferentes artes) */
export async function getAllPrints(
  oracleId: string
): Promise<ScryfallCard[]> {
  try {
    const res = await fetch(
      `${BASE}/cards/search?q=oracleid%3A${oracleId}&unique=prints&order=released`,
      { headers, next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json: SearchResponse = await res.json();
    return json.data;
  } catch (err) {
    console.error("Scryfall getAllPrints error:", err);
    return [];
  }
}

/** Devuelve la URL de imagen segura para una carta (maneja DFC) */
export function getCardImage(
  card: ScryfallCard,
  size: "small" | "normal" | "large" = "normal"
): string {
  if (card.image_uris) return card.image_uris[size];
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size];
  return "/placeholder-card.png";
}