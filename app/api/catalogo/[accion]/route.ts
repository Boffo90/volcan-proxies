/**
 * Puerta única a los catálogos de cartas.
 *
 * Todo pasa por el servidor a propósito, aunque Scryfall permita que la
 * consulte el navegador:
 *
 *  - se cachea de verdad. `next: { revalidate }` no hace nada en un componente
 *    de cliente, así que hoy cada visita repetía la misma búsqueda contra la
 *    API. Acá la respuesta queda en el CDN y la segunda visita no sale a
 *    internet.
 *  - no todos los catálogos permiten lo mismo. Hay APIs que piden no golpear
 *    sus imágenes desde el navegador de cada visitante, y eso solo se puede
 *    respetar si la llamada sale de un lugar nuestro.
 */

import { NextResponse } from "next/server";
import {
  catalogoDe,
  parseUid,
  catalogo,
  esIdioma,
  IDIOMA_BASE,
  type Catalogo,
  type IdiomaId,
} from "@/lib/catalogo";

/** Una hora, igual que el revalidate que ya tenía el cliente de Scryfall. */
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

const ACCIONES = [
  "buscar",
  "ficha",
  "versiones",
  "aleatorias",
  "autocompletar",
] as const;

type Accion = (typeof ACCIONES)[number];

function esAccion(v: string): v is Accion {
  return (ACCIONES as readonly string[]).includes(v);
}

/**
 * El idioma que este catálogo puede entregar de verdad.
 *
 * Es el único lugar donde se decide: si alguien pide japonés en Pokémon o
 * español en Yu-Gi-Oh — que la URL permite escribir a mano — se sirve en
 * inglés en vez de devolver vacío. Cada catálogo declara lo suyo en `idiomas`.
 */
function idiomaServible(cat: Catalogo, pedido: string | null): IdiomaId {
  if (!pedido || !esIdioma(pedido)) return IDIOMA_BASE;
  return cat.idiomas.includes(pedido) ? pedido : IDIOMA_BASE;
}

/** El catálogo y el id que nombra un uid ("mtg:xxx" o un id pelado). */
function desdeUid(uid: string) {
  const { juego, nativoId } = parseUid(uid);
  return { cat: catalogo(juego), nativoId };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ accion: string }> }
) {
  const { accion } = await params;
  if (!esAccion(accion)) {
    return NextResponse.json({ error: "Acción desconocida" }, { status: 404 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const uid = (url.searchParams.get("uid") || "").trim();
  const cat = catalogoDe(url.searchParams.get("juego"));
  const idioma = idiomaServible(cat, url.searchParams.get("idioma"));

  try {
    switch (accion) {
      case "buscar": {
        if (!q) return NextResponse.json({ cartas: [], total: 0 });
        const res = await cat.buscar(q, idioma);
        return NextResponse.json(
          { ...res, idioma },
          { headers: { "Cache-Control": CACHE } }
        );
      }

      // Todo el detalle en una sola llamada. Separado eran tres, y las dos
      // últimas volvían a resolver la misma carta para poder preguntar por
      // ella.
      case "ficha": {
        if (!uid) return NextResponse.json({ error: "Falta uid" }, { status: 400 });
        const { cat: c, nativoId } = desdeUid(uid);
        const carta = await c.porId(nativoId);
        if (!carta) {
          return NextResponse.json({ error: "No encontrada" }, { status: 404 });
        }
        const [versiones, rulings] = await Promise.all([
          c.versiones(carta),
          c.rulings ? c.rulings(carta) : Promise.resolve([]),
        ]);
        return NextResponse.json(
          { carta, versiones, rulings },
          { headers: { "Cache-Control": CACHE } }
        );
      }

      case "versiones": {
        if (!uid) return NextResponse.json({ error: "Falta uid" }, { status: 400 });
        const { cat: c, nativoId } = desdeUid(uid);
        const carta = await c.porId(nativoId);
        if (!carta) return NextResponse.json({ cartas: [] });
        const cartas = await c.versiones(carta);
        return NextResponse.json({ cartas }, { headers: { "Cache-Control": CACHE } });
      }

      case "aleatorias": {
        const n = Math.min(20, Math.max(1, Number(url.searchParams.get("n")) || 10));
        const cartas = await cat.aleatorias(n, idioma);
        // Sin caché: si se cachean dejan de ser aleatorias y el botón
        // "otras aleatorias" devuelve siempre las mismas.
        return NextResponse.json({ cartas });
      }

      case "autocompletar": {
        if (q.length < 2) return NextResponse.json({ nombres: [] });
        const nombres = await cat.autocompletar(q, idioma);
        return NextResponse.json({ nombres }, { headers: { "Cache-Control": CACHE } });
      }
    }
  } catch (err) {
    console.error(`catálogo/${accion}:`, err);
    // La razón viaja en la respuesta a propósito.
    //
    // Antes decía solo "El catálogo no respondió", y con eso una caída en
    // producción es indistinguible de un bloqueo o de un plazo vencido: hubo
    // que adivinar. Es texto nuestro sobre una API pública, no filtra nada.
    const motivo = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "El catálogo no respondió", motivo, cartas: [], total: 0 },
      { status: 502 }
    );
  }
}
