/**
 * Los "mazos listos": listas que se juegan de verdad, no productos oficiales.
 *
 * Las cEDH son la lista mejor ubicada de cada comandante en torneos grandes
 * del último año (edhtop16); las de Bracket 3, el mazo promedio de EDHREC.
 * `scripts/fetch-mazos.mjs` las trae a los .txt de `data/mazos/`, donde el
 * nombre y los textos de "juega" y "gana" sí son nuestros, y
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

export type MazoCombo = {
  /** Id del combo en Commander Spellbook, para enlazarlo. */
  id: string;
  cartas: string[];
  /** Lo que produce, ya en castellano. */
  produce: string[];
};

export type Mazo = Omit<MazoResumen, "tokens" | "gameChangers"> & {
  /** Cómo juega, en un párrafo. */
  juega: string;
  /** Cómo gana, una línea por vía. */
  gana: string[];
  /**
   * De dónde salió la lista: el resultado de torneo (edhtop16) o el mazo
   * promedio (EDHREC). Se muestra en la página; no es decoración, es lo que
   * respalda que la lista sea la que se juega y no una inventada.
   */
  fuente: string;
  fuenteUrl: string;
  /**
   * Los combos que la lista trae completos, según Commander Spellbook. No los
   * escribimos nosotros: salen de mandarle el mazo a su buscador al armarlo.
   * Vacío si el mazo no tiene ninguno (o si Spellbook no respondió ese día).
   */
  combos?: MazoCombo[];
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
      "Commander competitivo. Cada lista es la que mejor quedó con ese comandante en torneos de 50 jugadores o más durante el último año: rápidas, con mucha interacción gratis y combos que cierran la partida.",
  },
  {
    id: "b3",
    label: "Bracket 3",
    descripcion:
      "Más fuertes que un precon y pensados para mesas casuales con ganas de competir, con 3 Game Changers como máximo. Cada lista es el mazo promedio de ese comandante entre miles de mazos de Bracket 3.",
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
