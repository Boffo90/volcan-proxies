/**
 * Lo que usan las páginas para hablar con los catálogos.
 *
 * Nadie llama a una API de cartas desde el navegador: todo entra por
 * `/api/catalogo/…`, que es donde está la caché y donde se respetan las
 * condiciones de cada catálogo. Las firmas son las mismas del contrato, con
 * `uid` en vez del objeto carta porque lo que viaja por la URL es un id.
 */

import type { IdiomaId } from "./idiomas";
import type { CartaCatalogo, JuegoId, ResultadoBusqueda, Ruling } from "./tipos";

async function pedir<T>(accion: string, params: Record<string, string>, vacio: T): Promise<T> {
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/catalogo/${accion}?${qs}`);
    if (!res.ok) return vacio;
    return (await res.json()) as T;
  } catch {
    return vacio;
  }
}

export function buscar(
  juego: JuegoId,
  q: string,
  idioma: IdiomaId
): Promise<ResultadoBusqueda> {
  return pedir<ResultadoBusqueda>(
    "buscar",
    { juego, q, idioma },
    { cartas: [], total: 0 }
  );
}

export type FichaCarta = {
  carta: CartaCatalogo;
  versiones: CartaCatalogo[];
  rulings: Ruling[];
};

/** El detalle completo de una carta, o null si el catálogo no la tiene. */
export async function ficha(uid: string): Promise<FichaCarta | null> {
  const r = await pedir<Partial<FichaCarta>>("ficha", { uid }, {});
  return r.carta
    ? { carta: r.carta, versiones: r.versiones ?? [], rulings: r.rulings ?? [] }
    : null;
}

export async function versiones(uid: string): Promise<CartaCatalogo[]> {
  const r = await pedir<{ cartas: CartaCatalogo[] }>("versiones", { uid }, { cartas: [] });
  return r.cartas;
}

export async function aleatorias(
  juego: JuegoId,
  n: number,
  idioma: IdiomaId
): Promise<CartaCatalogo[]> {
  const r = await pedir<{ cartas: CartaCatalogo[] }>(
    "aleatorias",
    { juego, n: String(n), idioma },
    { cartas: [] }
  );
  return r.cartas;
}

export async function autocompletar(
  juego: JuegoId,
  q: string,
  idioma: IdiomaId
): Promise<string[]> {
  const r = await pedir<{ nombres: string[] }>(
    "autocompletar",
    { juego, q, idioma },
    { nombres: [] }
  );
  return r.nombres;
}
