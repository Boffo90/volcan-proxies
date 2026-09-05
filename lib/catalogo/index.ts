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
 * Riftbound lee de nuestra base, no de Riftcodex.
 *
 * Riftcodex responde 403 a los servidores de Vercel — Cloudflare bloqueando
 * tráfico de datacenter — así que las cartas se copian con
 * `node scripts/sync-riftbound.mjs` desde una máquina con IP residencial. Si
 * el catálogo aparece vacío, lo que falta es correr esa sincronización.
 */
export const CATALOGOS: Catalogo[] = [MTG, POKEMON, YGO, RIFTBOUND];

/** El que se muestra si nadie eligió: Magic sigue siendo el grueso de la venta. */
export const JUEGO_DEFAULT: JuegoId = "mtg";

export function catalogo(juego: JuegoId): Catalogo {
  return CATALOGOS.find((c) => c.id === juego) ?? MTG;
}

/** El catálogo que corresponde a un valor de URL o de formulario. */
export function catalogoDe(valor: string | null | undefined): Catalogo {
  return valor && esJuego(valor) ? catalogo(valor) : catalogo(JUEGO_DEFAULT);
}
