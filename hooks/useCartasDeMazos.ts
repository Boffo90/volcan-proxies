"use client";

import { useCallback, useRef, useState } from "react";

type Indice = { cartas: string[]; mazos: Record<string, number[]> };

/** Sin tildes ni mayúsculas, para que "dragon" encuentre "Dragón". */
export function plano(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Con menos letras que esto casi cualquier mazo trae una carta que calza. */
const MIN_LETRAS = 3;

/**
 * Buscar mazos por las cartas que traen.
 *
 * El índice (`_cartas.json`, lo escribe `scripts/build-indice-cartas.mjs`) pesa
 * bastante más que el listado, así que no viaja con la página: se pide la
 * primera vez que alguien toca el buscador. Hasta que llega, `buscar` no
 * encuentra nada por carta y el buscador sigue funcionando por nombre.
 */
export function useCartasDeMazos(url: string) {
  const [indice, setIndice] = useState<Indice | null>(null);
  const pedido = useRef(false);
  // Los nombres ya aplanados, calculados una vez al llegar el índice.
  const planos = useRef<string[]>([]);

  const cargar = useCallback(() => {
    if (pedido.current) return;
    pedido.current = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Indice | null) => {
        if (!j?.cartas || !j?.mazos) return;
        planos.current = j.cartas.map(plano);
        setIndice(j);
      })
      .catch(() => {
        // Sin índice se busca solo por nombre; se podrá reintentar.
        pedido.current = false;
      });
  }, [url]);

  /**
   * Para un texto, qué mazos traen una carta que lo contenga, y cuál: la
   * clave es la del índice ("fdc/reign-of-dragons") y el valor el nombre de la
   * carta, para poder decirle al cliente por qué apareció ese mazo.
   */
  const buscar = useCallback(
    (texto: string): Map<string, string> => {
      const hallados = new Map<string, string>();
      const t = plano(texto.trim());
      if (!indice || t.length < MIN_LETRAS) return hallados;

      const calzan = new Set<number>();
      planos.current.forEach((n, i) => {
        if (n.includes(t)) calzan.add(i);
      });
      if (calzan.size === 0) return hallados;

      for (const [clave, numeros] of Object.entries(indice.mazos)) {
        // Si alguna se llama exactamente así, esa: quien busca "Sol Ring"
        // no quiere leer "Trae Solemn Simulacrum".
        let mejor = -1;
        for (const n of numeros) {
          if (!calzan.has(n)) continue;
          if (mejor < 0 || planos.current[n] === t) mejor = n;
          if (planos.current[n] === t) break;
        }
        if (mejor >= 0) hallados.set(clave, indice.cartas[mejor]);
      }
      return hallados;
    },
    [indice]
  );

  return { cargar, buscar };
}
