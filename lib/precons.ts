/**
 * Los mazos preconstruidos de Commander.
 *
 * Viven como archivos del repo, no en una API ni en la base: los escribe
 * `scripts/sync-precons.mjs` y hay que volver a correrlo cuando sale un
 * producto nuevo. La página de un precon no depende de nadie para mostrarse.
 *
 *   data/precons-index.json            el listado (este módulo lo importa)
 *   public/precons/<set>/<slug>.json   las cartas de cada mazo
 *
 * Las cartas van en `public/` a propósito: el importador las pide desde el
 * navegador cuando el cliente aprieta "Pedir este mazo", y así las sirve el
 * CDN sin pasar por una función.
 */

import indice from "@/data/precons-index.json";

export type ColorMana = "W" | "U" | "B" | "R" | "G";

export type GrupoCarta =
  | "comandante"
  | "criatura"
  | "planeswalker"
  | "batalla"
  | "instantaneo"
  | "conjuro"
  | "artefacto"
  | "encantamiento"
  | "tierra"
  | "otro";

export type PreconResumen = {
  set: string;
  slug: string;
  nombre: string;
  setNombre: string;
  /** Fecha de salida, "2026-10-02". */
  fecha: string;
  comandantes: { n: string; id: string }[];
  colores: ColorMana[];
  /** Cartas del mazo, contando copias. */
  total: number;
  /** Cuántas de esas existen en español con imagen imprimible. */
  enEs: number;
  /** Cuántos tokens distintos crea el mazo. */
  tokens: number;
  /** Universes Beyond: Fallout, Doctor Who, Final Fantasy… */
  ub: boolean;
};

export type PreconCarta = {
  /** Nombre en inglés. */
  n: string;
  /** Cantidad. */
  q: number;
  /** Id de Scryfall de la impresión que trae el producto. */
  id: string;
  /** Set y número de coleccionista de esa impresión. */
  s: string;
  c: string;
  t: GrupoCarta;
  /**
   * Id de Scryfall de la impresión en español, si la carta salió en español.
   * Ausente si no existe en ninguna edición.
   */
  es?: string;
  /**
   * 1 cuando esa impresión española es de OTRA edición que la del producto:
   * la carta se puede leer en español, pero el arte o el marco pueden cambiar.
   */
  esOtra?: 1;
};

export type PreconToken = { n: string; id: string; s: string; c: string };

export type Precon = Omit<PreconResumen, "tokens"> & {
  tokens: PreconToken[];
  cartas: PreconCarta[];
};

export const PRECONS = indice as PreconResumen[];

/** El orden en que se lee una lista de Commander. */
export const GRUPOS: { id: GrupoCarta; label: string }[] = [
  { id: "comandante", label: "Comandante" },
  { id: "criatura", label: "Criaturas" },
  { id: "planeswalker", label: "Planeswalkers" },
  { id: "batalla", label: "Batallas" },
  { id: "instantaneo", label: "Instantáneos" },
  { id: "conjuro", label: "Conjuros" },
  { id: "artefacto", label: "Artefactos" },
  { id: "encantamiento", label: "Encantamientos" },
  { id: "tierra", label: "Tierras" },
  { id: "otro", label: "Otras" },
];

export type TallaImagen = "small" | "normal" | "large" | "png" | "art_crop";

/**
 * La imagen de una impresión, armada desde su id.
 *
 * El CDN de Scryfall ordena los archivos por los dos primeros caracteres del
 * id, así que no hace falta preguntarle a la API por cada carta: cien cartas
 * de un mazo son cien direcciones que se escriben solas.
 */
export function imagenDeScryfall(id: string, talla: TallaImagen = "normal"): string {
  const ext = talla === "png" ? "png" : "jpg";
  return `https://cards.scryfall.io/${talla}/front/${id[0]}/${id[1]}/${id}.${ext}`;
}

export function rutaPrecon(p: { set: string; slug: string }): string {
  return `/precons/${p.set}/${p.slug}`;
}

/** Dónde está el archivo con las cartas, para pedirlo desde el navegador. */
export function archivoPrecon(set: string, slug: string): string {
  return `/precons/${set}/${slug}.json`;
}

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/** "2026-10-02" -> "2 oct 2026". A mano: no depende del huso del servidor. */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}

export function anioDe(p: PreconResumen): string {
  return p.fecha.slice(0, 4);
}

/** Todas las cartas del mazo existen en español. */
export function espanolCompleto(p: { total: number; enEs: number }): boolean {
  return p.enEs >= p.total;
}

/** "Comandante A + Comandante B" */
export function nombreComandantes(p: { comandantes: { n: string }[] }): string {
  return p.comandantes.map((c) => c.n).join(" + ");
}
