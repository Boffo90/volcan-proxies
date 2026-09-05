import { searchCards, type ScryfallCard } from "./scryfall";
import { aCarta, enIdioma } from "./catalogo/mtg";
import { IDIOMA_BASE, type IdiomaId } from "./catalogo/idiomas";
import type { CartaCatalogo } from "./catalogo/tipos";

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
  /**
  * Ya normalizada al contrato de catálogo: el resto del sitio no distingue
  * una carta que llegó por decklist de una que llegó por el buscador.
  */
  card?: CartaCatalogo;
  errorMsg?: string;
  /**
  * Algo que el cliente tiene que saber de esta línea aunque haya resuelto.
  * Hoy solo uno: que el set y el número que traía apuntaban a otra carta.
  */
  aviso?: string;
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
*
* El idioma se aplica al final, sobre la impresión ya encontrada: las listas
* de Moxfield y Archidekt vienen en inglés, así que primero hay que saber de
* qué carta se trata y recién después pedirla traducida. Es el mismo orden que
* recomienda Scryfall, que no tiene búsqueda por nombre en otro idioma.
*/
/**
 * El nombre, comparable: sin tildes, sin mayúsculas y sin puntuación.
 *
 * Las listas vienen escritas a mano o exportadas de sitios que no coinciden en
 * apóstrofos y guiones, así que comparar tal cual da falsos negativos.
 */
function normalizarNombre(v: string): string {
  return v
	.normalize("NFD")
	.replace(/[̀-ͯ]/g, "")
	.toLowerCase()
	.replace(/[^a-z0-9 ]/g, "")
	.replace(/\s+/g, " ")
	.trim();
}

/**
 * Si la carta que resolvió el set+número es la que nombra la línea.
 *
 * Una carta de dos caras se llama "Delver of Secrets // Insectile Aberration"
 * y la lista trae solo la primera, así que cada cara cuenta como coincidencia.
 */
function nombresCalzan(deLaLinea: string, deLaCarta: string): boolean {
  const pedido = normalizarNombre(deLaLinea);
  if (!pedido) return true;
  return deLaCarta
	.split("//")
	.map(normalizarNombre)
	.some((cara) => cara === pedido || normalizarNombre(deLaCarta) === pedido);
}

export async function resolveCard(
  line: ParsedLine,
  idioma: IdiomaId = IDIOMA_BASE
): Promise<ImportedCard> {
  // El set y el número mandan sobre el nombre, PERO hay que comprobar que
  // apunten a la misma carta. Si no, la lista con un número desactualizado te
  // manda otra cosa sin avisar: "1 Sol Ring (CMR) 410" trae Abrade, porque CMR
  // 410 es Abrade. El cliente pidió una carta y recibía otra.
  let aviso: string | undefined;

  // Caso 1: tiene set + collector
  if (line.set && line.collector_number) {
	try {
  	const res = await fetch(
    	`https://api.scryfall.com/cards/${line.set}/${line.collector_number}`,
    	{ headers: { Accept: "application/json" } }
  	);
  	if (res.ok) {
    	const card: ScryfallCard = await res.json();
    	if (nombresCalzan(line.name, card.name)) {
      	return { ...line, status: "ok", card: aCarta(await enIdioma(card, idioma)) };
    	}
    	// Gana el nombre: es lo que un humano escribió y lo que reconoce. El
    	// número es dato de máquina y es lo que se desactualiza.
    	aviso =
      	`(${line.set.toUpperCase()}) ${line.collector_number} es ` +
      	`"${card.name}", no "${line.name}". Se usó el nombre.`;
  	}
	} catch {
  	// sigue al siguiente intento
	}
  }

  // Caso 2: solo tiene set
  if (line.set && !line.collector_number) {
	const search = await searchCards(`!"${line.name}" set:${line.set}`);
	if (search?.data?.length) {
  	return {
    	...line,
    	status: "ok",
    	aviso,
    	card: aCarta(await enIdioma(search.data[0], idioma)),
  	};
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
  	return {
    	...line,
    	status: "ok",
    	aviso,
    	card: aCarta(await enIdioma(card, idioma)),
  	};
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
  	return {
    	...line,
    	status: "ok",
    	aviso,
    	card: aCarta(await enIdioma(card, idioma)),
  	};
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
  onProgress?: (done: number, total: number) => void,
  idioma: IdiomaId = IDIOMA_BASE
): Promise<ImportedCard[]> {
  const results: ImportedCard[] = [];
  for (let i = 0; i < lines.length; i++) {
	const result = await resolveCard(lines[i], idioma);
	results.push(result);
	onProgress?.(i + 1, lines.length);
	// pequeño delay para respetar a Scryfall (recomiendan 50-100ms)
	if (i < lines.length - 1) {
  	await new Promise((r) => setTimeout(r, 80));
	}
  }
  return results;
}

