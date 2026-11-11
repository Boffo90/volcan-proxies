import { getCardsByIds, type ScryfallCard } from "./scryfall";
import { aCarta } from "./catalogo/mtg";
import type { IdiomaId } from "./catalogo/idiomas";
import type { ImportedCard } from "./deckParser";
import { archivoPrecon, type Precon } from "./precons";
import { archivoMazo } from "./mazos";

/** El archivo del mazo, o null si esa dirección no es de ninguno. */
export async function traerPrecon(set: string, slug: string): Promise<Precon | null> {
  if (!/^[a-z0-9]+$/.test(set) || !/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const res = await fetch(archivoPrecon(set, slug));
    if (!res.ok) return null;
    return (await res.json()) as Precon;
  } catch {
    return null;
  }
}

/**
 * Un mazo listo, con la misma forma: comparten cartas y tokens, que es todo
 * lo que usa `resolverPrecon`.
 */
export async function traerMazo(
  slug: string
): Promise<Pick<Precon, "nombre" | "cartas" | "tokens"> | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const res = await fetch(archivoMazo(slug));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Un precon, convertido en lo mismo que entrega el importador de listas.
 *
 * Una lista pegada se resuelve carta por carta contra Scryfall, y cien cartas
 * son cien peticiones y casi medio minuto. Acá no hace falta: el archivo del
 * mazo ya trae el id exacto de cada impresión —y el de su versión en español,
 * si existe—, así que todo el mazo se pide en dos llamadas.
 *
 * Solo el español viene resuelto de antemano. En cualquier otro idioma el
 * mazo llega en inglés y el cliente lo ve tal cual en la revisión.
 */
export async function resolverPrecon(
  mazo: Pick<Precon, "cartas" | "tokens">,
  idioma: IdiomaId,
  conTokens: boolean
): Promise<ImportedCard[]> {
  const enEspanol = idioma === "es";
  // `typeof` y no solo "si existe": Scryfall rechaza el lote ENTERO si uno de
  // los identificadores no es un id, y un archivo viejo o mal escrito dejaría
  // al cliente sin ninguna de las cien cartas por culpa de una.
  const idDe = (c: Precon["cartas"][number]) =>
    enEspanol && typeof c.es === "string" && c.es ? c.es : c.id;

  const ids = new Set<string>();
  for (const c of mazo.cartas) {
    ids.add(idDe(c));
    // La inglesa también: es el respaldo si la española no llega.
    ids.add(c.id);
  }
  if (conTokens) for (const t of mazo.tokens) ids.add(t.id);

  const porId = new Map<string, ScryfallCard>();
  for (const c of await getCardsByIds([...ids])) porId.set(c.id, c);

  const cartas: ImportedCard[] = mazo.cartas.map((c) => {
    const base = {
      raw: `${c.q} ${c.n}`,
      quantity: c.q,
      name: c.n,
      set: c.s,
      collector_number: c.c,
    };
    const sc = porId.get(idDe(c)) ?? porId.get(c.id);
    if (!sc) {
      return {
        ...base,
        status: "not_found" as const,
        errorMsg: "Scryfall no respondió por esta carta",
      };
    }
    return { ...base, status: "ok" as const, card: aCarta(sc) };
  });

  if (conTokens) {
    for (const t of mazo.tokens) {
      const sc = porId.get(t.id);
      if (!sc) continue;
      cartas.push({
        raw: `1 ${t.n}`,
        quantity: 1,
        name: t.n,
        set: t.s,
        collector_number: t.c,
        status: "ok",
        esToken: true,
        card: aCarta(sc),
      });
    }
  }

  return cartas;
}

/**
 * Los tokens que crean las cartas de una lista, ya como líneas para sumar.
 *
 * Scryfall guarda una entrada por cada impresión de un token, y dos cartas
 * del mazo suelen apuntar a impresiones distintas del mismo Tesoro. Se deja
 * uno por token (por su `oracle_id`), que es lo que el cliente espera: un
 * Tesoro, no cinco.
 */
export async function tokensDeLaLista(cartas: ImportedCard[]): Promise<ImportedCard[]> {
  const ids = [...new Set(cartas.flatMap((c) => c.tokenIds ?? []))];
  if (!ids.length) return [];

  const yaEstan = new Set(
    cartas.filter((c) => c.card).map((c) => c.card!.grupoId)
  );
  const vistos = new Set<string>();
  const tokens: ImportedCard[] = [];
  for (const sc of await getCardsByIds(ids)) {
    const st = sc.image_status;
    if (st === "placeholder" || st === "missing") continue;
    if (vistos.has(sc.oracle_id) || yaEstan.has(sc.oracle_id)) continue;
    vistos.add(sc.oracle_id);
    tokens.push({
      raw: `1 ${sc.name}`,
      quantity: 1,
      name: sc.name,
      set: sc.set,
      collector_number: sc.collector_number,
      status: "ok",
      esToken: true,
      card: aCarta(sc),
    });
  }
  return tokens.sort((a, b) => a.name.localeCompare(b.name));
}
