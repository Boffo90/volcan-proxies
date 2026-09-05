/**
 * Catálogo de Magic, sobre la API de Scryfall.
 *
 * `lib/scryfall.ts` sigue siendo el cliente crudo de la API y no sabe nada de
 * este contrato; acá se traduce lo que devuelve a `CartaCatalogo`. La misma
 * separación que hace Cardwright entre `scryfall.py` y `sources._Scryfall`.
 */

import {
  autocomplete,
  getAllPrints,
  getCardById,
  getCardsByIds,
  getCardImage,
  getPrintingInLanguage,
  getRulings,
  searchCards,
  type ScryfallCard,
} from "@/lib/scryfall";
import { TAMANO_INGLES } from "@/lib/formulas";
import { IDIOMA_BASE, esIdioma, type IdiomaId } from "./idiomas";
import {
  armarUid,
  type Catalogo,
  type CampoFicha,
  type CartaCatalogo,
  type ResultadoBusqueda,
  type Ruling,
} from "./tipos";

/**
 * La cara que trae los datos. Una carta de dos caras (MDFC, transform) deja
 * vacíos `mana_cost`, `type_line` y `oracle_text` en la raíz y los guarda en
 * `card_faces`; sin esto la ficha de esas cartas sale en blanco.
 */
function cara(c: ScryfallCard): ScryfallCard | NonNullable<ScryfallCard["card_faces"]>[number] {
  if (c.image_uris || !c.card_faces?.length) return c;
  return c.card_faces[0];
}

function ficha(c: ScryfallCard): CampoFicha[] {
  const f = cara(c);
  const campos: CampoFicha[] = [];
  if (f.mana_cost) campos.push({ label: "Costo", value: f.mana_cost, render: "mana" });
  // Lo impreso primero: en una carta en español el tipo dice "Criatura", y
  // mostrarle "Creature" al cliente que eligió español no tiene sentido.
  const tipo = f.printed_type_line || f.type_line;
  if (tipo) campos.push({ label: "Tipo", value: tipo });
  if (f.power || f.toughness) {
    campos.push({ label: "P/R", value: `${f.power ?? "?"}/${f.toughness ?? "?"}` });
  }
  if (c.loyalty) campos.push({ label: "Lealtad", value: c.loyalty });
  return campos;
}

/**
 * El nombre que el cliente va a ver impreso.
 *
 * `name` en Scryfall es siempre el inglés, incluso en una impresión japonesa;
 * el traducido está en `printed_name`. En una carta de dos caras ese campo no
 * está en la raíz sino en cada cara, así que se arma juntándolas — y si alguna
 * cara no tiene traducción, esa mitad queda en inglés, que es exactamente lo
 * que Scryfall tiene.
 */
function nombre(c: ScryfallCard): string {
  if (c.printed_name) return c.printed_name;
  const caras = c.card_faces ?? [];
  if (caras.length) {
    const partes = caras.map((f) => f.printed_name || f.name).filter(Boolean);
    if (partes.length) return partes.join(" // ");
  }
  return c.name;
}

export function aCarta(c: ScryfallCard): CartaCatalogo {
  const f = cara(c);
  const texto = f.printed_text || f.oracle_text;
  return {
    uid: armarUid("mtg", c.id),
    juego: "mtg",
    nativoId: c.id,
    name: nombre(c),
    // El agrupador sigue siendo el oracle_id, que no cambia con el idioma:
    // las versiones de una carta son sus impresiones, no sus traducciones.
    grupoId: c.oracle_id,
    set: c.set,
    // El escaneo flojo se dice, igual que la contra de cada acabado: es la
    // base desde la que se hace el upscale.
    set_name:
      c.image_status === "lowres"
        ? `${c.set_name} · escaneo de baja resolución`
        : c.set_name,
    collector_number: c.collector_number,
    rarity: c.rarity,
    artist: c.artist,
    // Scryfall trae una impresión por idioma, cada una con su propio id, así
    // que el idioma viene en la carta y no hay que arrastrarlo aparte.
    idioma: esIdioma(c.lang) ? c.lang : IDIOMA_BASE,
    imagenes: {
      small: getCardImage(c, "small"),
      normal: getCardImage(c, "normal"),
      large: getCardImage(c, "large"),
      // El PNG de Scryfall son 745×1040, que por 4 dan exactamente los
      // 2976×4160 que necesita una carta de 63×88 mm a 1200 DPI.
      print: getCardImage(c, "png"),
    },
    ficha: ficha(c),
    texto: texto ? { label: "Texto", value: texto, render: "mana" } : undefined,
  };
}

/**
 * Una imagen que sirve para imprimir.
 *
 * "placeholder" y "missing" no son la carta: Scryfall devuelve un cartel que
 * dice "Localized Image Not Available". En inglés casi no aparecen, pero una
 * búsqueda en español trae 11 de 39 así — imprimir eso sería mandarle al
 * cliente una carta con un aviso de error encima.
 *
 * "lowres" sí es la carta, solo que escaneada peor; se queda, y se avisa.
 */
function imprimible(c: ScryfallCard): boolean {
  const st = c.image_status;
  return st !== "placeholder" && st !== "missing";
}

/** Las cartas de una respuesta que se pueden imprimir de verdad. */
function aCartas(cards: ScryfallCard[] | undefined): CartaCatalogo[] {
  return (cards ?? []).filter(imprimible).map(aCarta);
}

/**
 * La misma impresión en otro idioma, o la original si no se puede.
 *
 * Dos motivos para quedarse con la original: que esa carta no haya salido en
 * ese idioma (lo normal en promos), o que la versión traducida sea un
 * placeholder — `m11/149` en español devuelve el cartel de "imagen no
 * disponible", y eso impreso es una carta arruinada. En los dos casos vale
 * más la carta en inglés, que es lo que el cliente iba a recibir igual.
 */
export async function enIdioma(
  c: ScryfallCard,
  idioma: IdiomaId
): Promise<ScryfallCard> {
  if (idioma === IDIOMA_BASE || !c.set || !c.collector_number) return c;
  const traducida = await getPrintingInLanguage(
    c.set,
    c.collector_number,
    idioma
  );
  return traducida && imprimible(traducida) ? traducida : c;
}

export const MTG: Catalogo = {
  id: "mtg",
  nombre: "Magic: The Gathering",
  corto: "MTG",
  tamano: TAMANO_INGLES,
  placeholder: 'Ej: "Lightning Bolt", "t:dragon", "set:dom"',
  ayuda: "Tips: t:creature (tipo) · c:r (color rojo) · set:dom (set)",
  soportaMpcfill: true,
  // Scryfall los sirve todos: medido con Lightning Bolt, entre 7 y 66
  // impresiones según el idioma.
  idiomas: ["en", "es", "pt", "ja", "de", "fr", "it"],

  async buscar(q: string, idioma: IdiomaId): Promise<ResultadoBusqueda> {
    // Con `lang:` Scryfall además busca por el nombre traducido: "Relámpago"
    // encuentra 39 cartas en español, que en inglés no encontraría ninguna.
    const res = await searchCards(`${q} lang:${idioma}`);
    // Una carta que no salió en ese idioma no existe para esa búsqueda. Antes
    // de devolver vacío se reintenta en inglés, que es lo que se imprime
    // cuando no hay versión traducida.
    if (!res?.data?.length && idioma !== IDIOMA_BASE) {
      const enIngles = await searchCards(`${q} lang:${IDIOMA_BASE}`);
      return {
        cartas: aCartas(enIngles?.data),
        total: enIngles?.total_cards ?? 0,
      };
    }
    return {
      cartas: aCartas(res?.data),
      total: res?.total_cards ?? 0,
    };
  },

  async porId(nativoId: string) {
    const c = await getCardById(nativoId);
    return c ? aCarta(c) : null;
  },

  async porIds(nativoIds: string[]) {
    return aCartas(await getCardsByIds(nativoIds));
  },

  async versiones(carta: CartaCatalogo) {
    return aCartas(await getAllPrints(carta.grupoId));
  },

  async aleatorias(n: number, idioma: IdiomaId) {
    // Dos llamadas, no n.
    //
    // Antes esto pedía `/cards/random` una vez por carta, en paralelo: diez
    // peticiones simultáneas a una API que pide 50-100 ms entre una y otra.
    // Con el filtro de imprimibles hubo que pedir todavía más, y ahí Scryfall
    // empezó a cortarnos y la grilla salía vacía. Una página al azar de la
    // búsqueda trae 175 de una vez y deja margen de sobra para filtrar.
    const q = `lang:${idioma}`;
    const primera = await searchCards(q, 1);
    const total = primera?.total_cards ?? 0;
    if (!total) return [];

    const porPagina = Math.max(1, primera?.data?.length ?? 175);
    const paginas = Math.ceil(total / porPagina);
    const page = 1 + Math.floor(Math.random() * paginas);
    const res = page === 1 ? primera : await searchCards(q, page);

    const cartas = aCartas(res?.data);
    for (let i = cartas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
    }
    return cartas.slice(0, n);
  },

  async autocompletar(q: string) {
    // El autocompletado de Scryfall solo conoce los nombres en inglés — no
    // acepta `lang:` y `include_multilingual` devuelve vacío. La búsqueda sí
    // entiende el nombre traducido, así que la sugerencia queda en inglés y
    // el resultado sale en el idioma elegido.
    return autocomplete(q);
  },

  async rulings(carta: CartaCatalogo): Promise<Ruling[]> {
    const rs = await getRulings(carta.nativoId);
    return rs.map((r) => ({ fecha: r.published_at, texto: r.comment }));
  },
};
