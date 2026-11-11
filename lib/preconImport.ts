import { getCardsByIds, type ScryfallCard } from "./scryfall";
import { aCarta } from "./catalogo/mtg";
import type { IdiomaId } from "./catalogo/idiomas";
import type { ImportedCard } from "./deckParser";
import { archivoPrecon, type Precon } from "./precons";
import { archivoMazo } from "./mazos";
import type { CartaCatalogo } from "./catalogo/tipos";
import type { MpcCard } from "@/app/api/mpcfill/route";

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

/** "Sol Ring (Borderless) [CMR]" -> "Sol Ring": el nombre de la carta a secas. */
function nombreLimpio(v: string): string {
  return v
    .replace(/\.(png|jpe?g|webp)$/i, "")
    .replace(/\s*[([{].*$/, "")
    .trim();
}

/** Cartas de Scryfall por nombre exacto, de a 75. Las que no existan faltan. */
async function porNombres(nombres: string[]): Promise<Map<string, ScryfallCard>> {
  const mapa = new Map<string, ScryfallCard>();
  for (let i = 0; i < nombres.length; i += 75) {
    try {
      const res = await fetch("https://api.scryfall.com/cards/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          identifiers: nombres.slice(i, i + 75).map((name) => ({ name })),
        }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      for (const c of (json?.data ?? []) as ScryfallCard[]) {
        mapa.set(c.name.toLowerCase(), c);
        // Una carta de dos caras se nombra por la primera.
        mapa.set(c.name.split(" // ")[0].toLowerCase(), c);
      }
    } catch {
      // Un lote que falla no se lleva los demás.
    }
  }
  return mapa;
}

/**
 * Una carta que existe solo como diseño de MPCFill.
 *
 * Pasa con tokens, cartas custom y nombres que Scryfall no reconoce. El
 * diseño igual se puede imprimir —lo que se manda a producir es el archivo de
 * MPCFill—, así que la línea se arma con lo que hay en vez de rechazarla.
 */
function cartaSoloMpc(mpc: MpcCard, nombre: string): CartaCatalogo {
  return {
    uid: "mtg:mpc-" + mpc.id,
    juego: "mtg",
    nativoId: "mpc-" + mpc.id,
    name: nombre,
    grupoId: "mpc-" + mpc.id,
    set: "mpc",
    set_name: "MPCFill",
    collector_number: "",
    idioma: "en",
    imagenes: { small: mpc.thumb, normal: mpc.thumb, large: mpc.thumb, print: mpc.thumb },
    ficha: [],
  };
}

/**
 * El archivo de pedido que entrega mpcfill.com (cards.xml), convertido en
 * líneas de revisión con el arte que el cliente ya eligió allá.
 *
 * Del XML se usan solo los frentes: cada `<card>` trae el id del diseño y en
 * `<slots>` las posiciones que ocupa, o sea cuántas copias son. Los dorsos del
 * archivo se ignoran: acá el dorso se elige en el carrito.
 */
export async function resolverXmlMpc(xml: string): Promise<ImportedCard[]> {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Ese archivo no es un XML válido.");
  }
  const nodos = [...doc.querySelectorAll("order > fronts > card")];
  if (nodos.length === 0) {
    throw new Error(
      "Ese XML no es un pedido de MPCFill: no trae cartas. Bájalo desde mpcfill.com con Download."
    );
  }

  const pedidas = new Map<string, { cantidad: number; nombre: string }>();
  for (const n of nodos) {
    const id = n.querySelector("id")?.textContent?.trim() ?? "";
    if (!/^[\w-]{10,80}$/.test(id)) continue;
    const slots = (n.querySelector("slots")?.textContent ?? "")
      .split(",")
      .filter((s) => s.trim() !== "").length;
    const nombre =
      n.querySelector("query")?.textContent?.trim() ||
      nombreLimpio(n.querySelector("name")?.textContent ?? "");
    const previa = pedidas.get(id);
    pedidas.set(id, {
      cantidad: (previa?.cantidad ?? 0) + Math.max(1, slots),
      nombre: previa?.nombre || nombre,
    });
  }
  if (pedidas.size === 0) throw new Error("No pudimos leer ningún diseño de ese archivo.");

  const res = await fetch("/api/mpcfill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [...pedidas.keys()] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "MPCFill no respondió.");
  const mpcPorId = new Map<string, MpcCard>(
    ((json.cards ?? []) as MpcCard[]).map((c) => [c.id, c])
  );

  const nombres = [
    ...new Set([...mpcPorId.values()].map((m) => nombreLimpio(m.name)).filter(Boolean)),
  ];
  const enScryfall = await porNombres(nombres);

  const cartas: ImportedCard[] = [];
  for (const [id, { cantidad, nombre }] of pedidas) {
    const mpc = mpcPorId.get(id);
    if (!mpc) {
      cartas.push({
        raw: `${cantidad} ${nombre || id}`,
        quantity: cantidad,
        name: nombre || id,
        status: "not_found",
        errorMsg: "Ese diseño ya no está en MPCFill",
      });
      continue;
    }
    const limpio = nombreLimpio(mpc.name) || nombre;
    const sc = enScryfall.get(limpio.toLowerCase());
    cartas.push({
      raw: `${cantidad} ${limpio}`,
      quantity: cantidad,
      name: sc ? sc.name : limpio,
      status: "ok",
      card: sc ? aCarta(sc) : cartaSoloMpc(mpc, limpio),
      mpc,
    });
  }
  return cartas;
}
