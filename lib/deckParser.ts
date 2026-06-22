import { searchCards, type ScryfallCard } from "./scryfall";

export type ParsedLine = {
  raw: string;
  quantity: number;
  name: string;
  set?: string;
  collector_number?: string;
  isSideboard?: boolean;
};

export type ImportedCard = ParsedLine & {
  status: "ok" | "not_found" | "pending";
  card?: ScryfallCard;
  errorMsg?: string;
};

/**
* Parsea una línea de mazo formato MTGO/Arena/Moxfield/Archidekt.
* Acepta:
*   "1 Lightning Bolt"
*   "1x Lightning Bolt"
*   "1 Lightning Bolt (M11)"
*   "1 Lightning Bolt (M11) 149"
*   "1 Lightning Bolt (M11) 149 *F*"
*   "SB: 1 Lightning Bolt"
*   "// comentario"
*/
export function parseLine(line: string): ParsedLine | null {
  const raw = line.trim();
  if (!raw || raw.startsWith("//") || raw.startsWith("#")) return null;

  // Quitar prefijo de sideboard
  let working = raw;
  let isSideboard = false;
  const sbMatch = working.match(/^(SB:|Sideboard:?)\s*/i);
  if (sbMatch) {
	working = working.slice(sbMatch[0].length);
	isSideboard = true;
  }

  // Quitar marcadores de foil/etc
  working = working.replace(/\*F\*/g, "").replace(/\*[A-Z]+\*/g, "").trim();

  // Regex principal: cantidad + nombre [+ (SET)] [+ collector]
  // Cantidad: "1 " o "1x " o "4 "
  const m = working.match(
	/^(\d+)x?\s+(.+?)(?:\s+\(([A-Za-z0-9]{2,6})\))?(?:\s+([A-Z0-9-]+))?$/
  );
  if (!m) return null;

  const quantity = parseInt(m[1], 10);
  let name = m[2].trim();
  const set = m[3]?.toLowerCase();
  const collector_number = m[4];

  // A veces Moxfield trae el nombre con "//" para DFC, lo dejamos tal cual
  // (Scryfall lo encuentra igual con la primera cara)
  if (name.includes(" // ")) {
	name = name.split(" // ")[0].trim();
  }

  if (!quantity || !name) return null;

  return {
	raw,
	quantity,
	name,
	set,
	collector_number,
	isSideboard,
  };
}

export function parseDeck(text: string): ParsedLine[] {
  return text
	.split(/\r?\n/)
	.map((l) => parseLine(l))
	.filter((p): p is ParsedLine => p !== null);
}

/**
* Para una línea parseada, busca la carta en Scryfall.
* Si tiene set+collector, usa /cards/{set}/{cn}
* Si solo tiene nombre, usa búsqueda exacta
*/
export async function resolveCard(line: ParsedLine): Promise<ImportedCard> {
  // Caso 1: tiene set + collector
  if (line.set && line.collector_number) {
	try {
  	const res = await fetch(
    	`https://api.scryfall.com/cards/${line.set}/${line.collector_number}`,
    	{ headers: { Accept: "application/json" } }
  	);
  	if (res.ok) {
    	const card: ScryfallCard = await res.json();
    	return { ...line, status: "ok", card };
  	}
	} catch {
  	// sigue al siguiente intento
	}
  }

  // Caso 2: solo tiene set
  if (line.set && !line.collector_number) {
	const search = await searchCards(`!"${line.name}" set:${line.set}`);
	if (search?.data?.length) {
  	return { ...line, status: "ok", card: search.data[0] };
	}
  }

  // Caso 3: solo nombre — búsqueda exacta
  try {
	const res = await fetch(
  	`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(line.name)}`,
  	{ headers: { Accept: "application/json" } }
	);
	if (res.ok) {
  	const card: ScryfallCard = await res.json();
  	return { ...line, status: "ok", card };
	}
  } catch {
	// sigue
  }

  // Caso 4: fuzzy
  try {
	const res = await fetch(
  	`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(line.name)}`,
  	{ headers: { Accept: "application/json" } }
	);
	if (res.ok) {
  	const card: ScryfallCard = await res.json();
  	return { ...line, status: "ok", card };
	}
  } catch {
	// sigue
  }

  return {
	...line,
	status: "not_found",
	errorMsg: "No se encontró esta carta en Scryfall",
  };
}

/** Procesa todas las líneas con rate limiting (~100ms entre requests) */
export async function resolveDeck(
  lines: ParsedLine[],
  onProgress?: (done: number, total: number) => void
): Promise<ImportedCard[]> {
  const results: ImportedCard[] = [];
  for (let i = 0; i < lines.length; i++) {
	const result = await resolveCard(lines[i]);
	results.push(result);
	onProgress?.(i + 1, lines.length);
	// pequeño delay para respetar a Scryfall (recomiendan 50-100ms)
	if (i < lines.length - 1) {
  	await new Promise((r) => setTimeout(r, 80));
	}
  }
  return results;
}

