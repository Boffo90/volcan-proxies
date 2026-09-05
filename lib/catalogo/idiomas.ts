/**
 * En qué idiomas se puede entregar una carta.
 *
 * No es una lista de deseos: cada catálogo declara lo que su fuente sirve de
 * verdad, medido contra la API el 4 de septiembre de 2026. Ofrecerle al
 * cliente un idioma que después no se puede imprimir es prometer algo que no
 * se cumple, y eso se paga en el despacho, no en la búsqueda.
 *
 * Lo que se midió:
 *
 *  - **Scryfall (Magic)** sirve los siete. `Lightning Bolt` existe en en (66
 *    impresiones), es (10), pt (7), ja (18), de (14), fr (14), it (11).
 *  - **TCGdex (Pokémon)** sirve seis: en, es, fr, de, it, pt. El japonés
 *    responde 404 — no es que devuelva la carta en inglés, no existe la ruta.
 *  - **YGOPRODeck (Yu-Gi-Oh)** lo dice en su propio mensaje de error: "This
 *    API accepts the following language values: 'fr', 'de', 'it' or 'pt'".
 *    Más el inglés por defecto. **No tiene español**, que es justo el que más
 *    se pediría acá.
 *  - **Riftcodex (Riftbound)** ignora el parámetro de idioma y devuelve
 *    siempre lo mismo: solo inglés.
 */

export const IDIOMAS = ["en", "es", "pt", "ja", "de", "fr", "it"] as const;

export type IdiomaId = (typeof IDIOMAS)[number];

/** El idioma que se usa cuando la carta no existe en el pedido. */
export const IDIOMA_BASE: IdiomaId = "en";

/**
 * Las etiquetas que ya usa el sitio.
 *
 * El pedido guarda el idioma como texto en español ("Inglés", "Español"),
 * así que la traducción tiene que ir en los dos sentidos: los pedidos que ya
 * están en la base traen esas palabras y tienen que seguir leyéndose.
 */
const ETIQUETAS: Record<IdiomaId, string> = {
  en: "Inglés",
  es: "Español",
  pt: "Portugués",
  ja: "Japonés",
  de: "Alemán",
  fr: "Francés",
  it: "Italiano",
};

export function etiquetaDeIdioma(id: IdiomaId): string {
  return ETIQUETAS[id];
}

/** El código de una etiqueta guardada. Lo desconocido se lee como inglés. */
export function idiomaDeEtiqueta(etiqueta: string | null | undefined): IdiomaId {
  if (!etiqueta) return IDIOMA_BASE;
  const limpio = etiqueta.trim().toLowerCase();
  const encontrado = (Object.keys(ETIQUETAS) as IdiomaId[]).find(
	(id) => ETIQUETAS[id].toLowerCase() === limpio || id === limpio
  );
  return encontrado ?? IDIOMA_BASE;
}

export function esIdioma(v: string): v is IdiomaId {
  return (IDIOMAS as readonly string[]).includes(v);
}

/**
 * Un id nativo con el idioma adentro: "es/sv03.5-006".
 *
 * Lo necesitan las fuentes cuyo id NO distingue idioma — TCGdex y YGOPRODeck
 * devuelven la misma carta con el mismo id y cambian solo el texto según un
 * parámetro. Sin esto, un pedido en francés y uno en inglés serían la misma
 * línea y se imprimiría cualquiera de los dos.
 *
 * Scryfall no lo necesita: ahí cada idioma es una impresión con id propio.
 */
export function conIdioma(idioma: IdiomaId, id: string): string {
  return `${idioma}/${id}`;
}

/**
 * Parte ese id. Sin prefijo se lee como inglés, que es lo que hay guardado en
 * los carritos y pedidos de antes de que el idioma existiera.
 */
export function sinIdioma(nativoId: string): { idioma: IdiomaId; id: string } {
  const corte = nativoId.indexOf("/");
  if (corte > 0) {
    const posible = nativoId.slice(0, corte);
    if (esIdioma(posible)) {
      return { idioma: posible, id: nativoId.slice(corte + 1) };
    }
  }
  return { idioma: IDIOMA_BASE, id: nativoId };
}
