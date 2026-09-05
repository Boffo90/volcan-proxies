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
  CATALOGOS,
  catalogoDe,
  parseUid,
  catalogo,
  esIdioma,
  IDIOMA_BASE,
  type Catalogo,
  type IdiomaId,
} from "@/lib/catalogo";
import type { JuegoId } from "@/lib/catalogo/tipos";

/** Una hora, igual que el revalidate que ya tenía el cliente de Scryfall. */
const CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

const ACCIONES = [
  "buscar",
  "ficha",
  "versiones",
  "aleatorias",
  "autocompletar",
  "sugerencias",
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
  // El respaldo es el primero que ESTE catálogo sirve, no el inglés global:
  // Mitos y Leyendas solo publica español, y caer al inglés ahí sería pedirle
  // algo que no existe.
  const respaldo = cat.idiomas[0] ?? IDIOMA_BASE;
  if (!pedido || !esIdioma(pedido)) return respaldo;
  return cat.idiomas.includes(pedido) ? pedido : respaldo;
}

/**
 * Cuánto se espera a un catálogo en el autocompletado de la barra.
 *
 * Por debajo del plazo normal de 8s: acá se consultan los cinco a la vez y el
 * más lento marcaría el ritmo de todos. El que no alcanza queda fuera de esta
 * pulsación y aparece en la siguiente; peor sería una barra que se congela
 * mientras el visitante escribe.
 *
 * Medido en frío: Riftbound 0,5s, Magic y Pokémon 0,6s, Yu-Gi-Oh 1,4s y Mitos
 * y Leyendas 2,1s. Estuvo en 2,5s y dejaba fuera a los dos últimos justo
 * cuando eran los que tenían la carta —buscar "exodia" no devolvía ninguna de
 * Yu-Gi-Oh—, así que el margen tiene que ser sobre el más lento, no sobre el
 * promedio. En caliente los cinco responden en menos de 0,3s.
 */
const PLAZO_SUGERENCIA_MS = 4000;

/** Sin tildes, sin mayúsculas: para comparar lo escrito con lo devuelto. */
function plano(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export type Sugerencia = { nombre: string; juego: JuegoId };

/** Lo que ofrece un catálogo, o nada si tarda o falla. */
async function sugerenciasDe(
  cat: Catalogo,
  q: string,
  pedido: string | null
): Promise<Sugerencia[]> {
  const idioma = idiomaServible(cat, pedido);
  try {
    const nombres = await Promise.race([
      cat.autocompletar(q, idioma),
      new Promise<string[]>((_, rechazar) =>
        setTimeout(() => rechazar(new Error("plazo")), PLAZO_SUGERENCIA_MS)
      ),
    ]);
    return nombres.map((nombre) => ({ nombre, juego: cat.id }));
  } catch {
    // Un catálogo caído no puede dejar sin sugerencias a los otros cuatro.
    return [];
  }
}

/**
 * Reparte los cupos por turnos en vez de concatenar.
 *
 * Magic devuelve diez nombres para casi cualquier texto, así que concatenando
 * llenaba la lista entera y los otros juegos no aparecían nunca — que es justo
 * el problema que esto viene a resolver.
 */
function repartir(porJuego: Sugerencia[][], tope: number): Sugerencia[] {
  const salida: Sugerencia[] = [];
  const vistos = new Set<string>();
  const largoMayor = Math.max(0, ...porJuego.map((l) => l.length));
  for (let i = 0; i < largoMayor && salida.length < tope; i++) {
    for (const lista of porJuego) {
      if (salida.length >= tope) break;
      const s = lista[i];
      if (!s) continue;
      const clave = `${s.juego}:${s.nombre.toLowerCase()}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      salida.push(s);
    }
  }
  return salida;
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

      // Autocompletado de la barra de arriba: los cinco catálogos a la vez.
      //
      // El abanico se abre acá y no en el navegador para que la barra haga
      // una petición y no cinco, y para que la respuesta ya cacheada sirva a
      // todos. Cada catálogo resuelve su propio idioma servible: pedir "en"
      // en Mitos y Leyendas, que solo publica español, devolvería vacío.
      case "sugerencias": {
        if (q.length < 2) return NextResponse.json({ sugerencias: [] });
        const tope = Math.min(
          12,
          Math.max(1, Number(url.searchParams.get("n")) || 8)
        );
        const pedido = url.searchParams.get("idioma");
        const porJuego = await Promise.all(
          CATALOGOS.map((c) => sugerenciasDe(c, q, pedido))
        );

        // Algunas fuentes buscan por aproximación y devuelven cosas que no
        // contienen lo escrito: Mitos y Leyendas contestaba "Chashkel" a
        // "charizard". En una lista de un solo juego se perdona; mezclando
        // cinco, es ruido que tapa las buenas.
        const buscado = plano(q);
        const calzan = porJuego.map((lista) =>
          lista.filter((s) => plano(s.nombre).includes(buscado))
        );

        // Si NADA calza al pie de la letra suele ser un error de tipeo, y ahí
        // la aproximación es justo lo que sirve. Se devuelve sin filtrar.
        const hayCalce = calzan.some((l) => l.length > 0);

        return NextResponse.json(
          { sugerencias: repartir(hayCalce ? calzan : porJuego, tope) },
          { headers: { "Cache-Control": CACHE } }
        );
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
