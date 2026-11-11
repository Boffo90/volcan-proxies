/**
 * Los "mazos listos": listas armadas por nosotros, no productos oficiales.
 *
 * Las fuentes son los .txt de `data/mazos/`, que se editan a mano, y
 * `scripts/build-mazos.mjs` las valida y las convierte en:
 *
 *   data/mazos-index.json        el listado (este módulo lo importa)
 *   public/mazos/<slug>.json     las cartas, con la misma forma de un precon
 *
 * Que compartan forma con los precons es lo que deja reusar la lista, el
 * panel de compra y la revisión del importador sin duplicar nada.
 */

import indice from "@/data/mazos-index.json";
import type { ColorMana, PreconCarta, PreconToken } from "./precons";

export type FormatoMazo = "cedh" | "b3";

export type MazoResumen = {
  slug: string;
  nombre: string;
  formato: FormatoMazo;
  /** "Combo / Midrange", "Tribal / Tokens"… */
  arquetipo: string;
  comandantes: { n: string; id: string }[];
  colores: ColorMana[];
  total: number;
  enEs: number;
  tokens: number;
  tierras: number;
  /** Valor de maná promedio de lo que no es tierra. */
  curva: number;
  gameChangers: number;
};

export type Mazo = Omit<MazoResumen, "tokens" | "gameChangers"> & {
  /** Cómo juega, en un párrafo. */
  juega: string;
  /** Cómo gana, una línea por vía. */
  gana: string[];
  gameChangers: string[];
  tokens: PreconToken[];
  cartas: PreconCarta[];
};

export const MAZOS = indice as MazoResumen[];

export const FORMATOS: {
  id: FormatoMazo;
  label: string;
  descripcion: string;
}[] = [
  {
    id: "cedh",
    label: "cEDH",
    descripcion:
      "Commander competitivo: listas rápidas, con mucha interacción gratis y combos que cierran la partida. Para mesas donde todos juegan a ganar.",
  },
  {
    id: "b3",
    label: "Bracket 3",
    descripcion:
      "Más fuertes que un precon y pensados para mesas casuales con ganas de competir. Sin destrucción masiva de tierras ni combos tempranos de dos cartas, y con 3 Game Changers como máximo.",
  },
];

export function etiquetaFormato(f: FormatoMazo): string {
  return FORMATOS.find((x) => x.id === f)?.label ?? f;
}

export function rutaMazo(m: { slug: string }): string {
  return `/mazos/${m.slug}`;
}

/** Dónde está el archivo con las cartas, para pedirlo desde el navegador. */
export function archivoMazo(slug: string): string {
  return `/mazos/${slug}.json`;
}
