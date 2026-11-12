import { NextResponse } from "next/server";

/**
 * Convierte el enlace de un mazo en una lista de texto, la misma que el
 * cliente pegaría a mano. Así el importador tiene un solo camino: lo que
 * llega por enlace pasa por el mismo parser y la misma revisión.
 *
 * Hoy entiende Archidekt, que publica una API abierta para sus mazos.
 *
 * Moxfield NO, y no es un olvido: su API responde 403 a los clientes
 * automáticos y la protege a propósito. La forma correcta de usarla es
 * pedirles acceso (entregan un identificador de cliente autorizado); mientras
 * eso no exista, a quien pega un enlace de Moxfield se le explica cómo
 * exportar la lista, que toma diez segundos.
 */

const PLAZO_MS = 8000;

type CartaArchidekt = {
  quantity?: number;
  categories?: string[] | null;
  card?: {
    collectorNumber?: string;
    edition?: { editioncode?: string };
    oracleCard?: { name?: string };
  };
};

type CategoriaArchidekt = { name?: string; includedInDeck?: boolean };

function error(mensaje: string, status: number) {
  return NextResponse.json({ error: mensaje }, { status });
}

async function deArchidekt(id: string) {
  const res = await fetch(`https://archidekt.com/api/decks/${id}/`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(PLAZO_MS),
    next: { revalidate: 300 },
  });
  if (res.status === 404) {
    return error("No encontramos ese mazo en Archidekt. Revisa el enlace.", 404);
  }
  if (res.status === 401 || res.status === 403) {
    return error(
      "Ese mazo es privado. Hazlo público en Archidekt o pega la lista.",
      403
    );
  }
  if (!res.ok) {
    return error("Archidekt no respondió. Prueba de nuevo o pega la lista.", 502);
  }

  const mazo = (await res.json()) as {
    name?: string;
    cards?: CartaArchidekt[];
    categories?: CategoriaArchidekt[];
  };

  // Las categorías que el dueño dejó fuera del mazo (Maybeboard, y las que
  // él mismo haya marcado así). Una carta se salta solo si TODAS las suyas
  // están fuera: Archidekt deja poner una carta en varias.
  const fuera = new Set(
    (mazo.categories ?? [])
      .filter((c) => c.includedInDeck === false && c.name)
      .map((c) => c.name as string)
  );

  const lineas: string[] = [];
  for (const c of mazo.cards ?? []) {
    const nombre = c.card?.oracleCard?.name;
    const cantidad = Math.floor(Number(c.quantity));
    if (!nombre || !(cantidad > 0)) continue;

    const cats = c.categories ?? [];
    if (cats.length && cats.every((k) => fuera.has(k))) continue;

    const set = c.card?.edition?.editioncode;
    const numero = c.card?.collectorNumber;
    // El parser del importador solo acepta sets de 2 a 6 letras o números y
    // un número de coleccionista sin espacios. Lo que no calce va sin
    // edición y se resuelve por nombre, en vez de romper la línea entera.
    const conEdicion =
      set && numero && /^[A-Za-z0-9]{2,6}$/.test(set) && /^[A-Za-z0-9-]+$/.test(numero);
    const sb = cats.includes("Sideboard") ? "SB: " : "";
    lineas.push(
      conEdicion
        ? `${sb}${cantidad} ${nombre} (${set.toUpperCase()}) ${numero.toUpperCase()}`
        : `${sb}${cantidad} ${nombre}`
    );
  }

  if (!lineas.length) {
    return error("Ese mazo no tiene cartas.", 422);
  }
  return NextResponse.json({
    origen: "Archidekt",
    nombre: mazo.name ?? "",
    lista: lineas.join("\n"),
  });
}

export async function GET(req: Request) {
  const crudo = new URL(req.url).searchParams.get("url")?.trim() ?? "";
  if (!crudo) return error("Falta el enlace del mazo.", 400);

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(crudo) ? crudo : "https://" + crudo);
  } catch {
    return error("Eso no parece un enlace.", 400);
  }
  // Solo se va a buscar a los sitios de esta lista, y solo con el id que se
  // saca del enlace: nunca se pide la dirección que mandó el navegador.
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  try {
    if (host === "archidekt.com") {
      const id = url.pathname.match(/\/decks\/(\d+)/)?.[1];
      if (!id) return error("Ese enlace de Archidekt no es de un mazo.", 400);
      return await deArchidekt(id);
    }

    if (host === "moxfield.com") {
      return error(
        "Moxfield no deja leer mazos por enlace. En tu mazo: More → Export → " +
          "Copy for MTGO, y pega la lista acá.",
        422
      );
    }

    return error(
      "Por enlace solo leemos Archidekt. De cualquier otro sitio, exporta el " +
        "mazo como texto y pega la lista.",
      422
    );
  } catch {
    return error("No pudimos traer el mazo. Prueba de nuevo o pega la lista.", 502);
  }
}
