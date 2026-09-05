/**
 * Registro de catálogos.
 *
 * Agregar un juego es escribir su módulo y sumarlo acá: las páginas recorren
 * `CATALOGOS` y no nombran ninguno en particular.
 */

import { MTG } from "./mtg";
import { YGO } from "./ygo";
import { RIFTBOUND } from "./riftbound";
import { POKEMON } from "./pokemon";
import { esJuego, type Catalogo, type JuegoId } from "./tipos";

export * from "./tipos";
export * from "./idiomas";

/**
 * Riftbound está fuera a propósito.
 *
 * Riftcodex nos responde 403 desde los servidores de Vercel: está detrás de
 * Cloudflare y bloquea el tráfico de datacenter. Desde una máquina con IP
 * residencial anda perfecto, que es por qué Cardwright nunca lo sufrió y por
 * qué en local no se veía.
 *
 * El módulo se queda porque sirve igual: la sincronización a nuestra propia
 * base corre desde la máquina de Seba, que sí pasa. Vuelve a la lista cuando
 * haya datos cargados.
 */
export const CATALOGOS: Catalogo[] = [MTG, POKEMON, YGO];

/** El que se muestra si nadie eligió: Magic sigue siendo el grueso de la venta. */
export const JUEGO_DEFAULT: JuegoId = "mtg";

export function catalogo(juego: JuegoId): Catalogo {
  return CATALOGOS.find((c) => c.id === juego) ?? MTG;
}

/** El catálogo que corresponde a un valor de URL o de formulario. */
export function catalogoDe(valor: string | null | undefined): Catalogo {
  return valor && esJuego(valor) ? catalogo(valor) : catalogo(JUEGO_DEFAULT);
}
