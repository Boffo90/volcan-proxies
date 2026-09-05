/**
 * Sirve las imágenes de los catálogos que piden no ser hotlinkeados.
 *
 * YGOPRODeck lo dice explícitamente: descarga las imágenes y sírvelas tú, no
 * apuntes a nuestro CDN desde cada visita. Esta ruta las trae una vez y las
 * deja cacheadas en el CDN nuestro, que es lo que corta el "cada visita".
 *
 * Es un proxy, así que la lista blanca de hosts no es opcional: sin ella
 * cualquiera podría usar el sitio para descargar lo que quiera desde nuestra
 * IP.
 */

import { NextResponse } from "next/server";
import { TIMEOUT_MS } from "@/lib/catalogo/http";

const HOSTS_PERMITIDOS = new Set(["images.ygoprodeck.com"]);

/** Un año: la imagen de una carta ya publicada no cambia. */
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(req: Request) {
  const cruda = new URL(req.url).searchParams.get("u");
  if (!cruda) {
	return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
  }

  let destino: URL;
  try {
	destino = new URL(cruda);
  } catch {
	return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (destino.protocol !== "https:" || !HOSTS_PERMITIDOS.has(destino.hostname)) {
	return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  try {
	const res = await fetch(destino.toString(), {
  	headers: { "User-Agent": "VolcanProxies/1.0 (+https://volcanproxies.cl)" },
  	// Una imagen pesa más que un JSON, así que el plazo es más largo que el
  	// del catálogo, pero existe: un CDN que no contesta no puede dejar la
  	// función colgada hasta que Vercel la corte.
  	signal: AbortSignal.timeout(TIMEOUT_MS * 2),
  	next: { revalidate: 31536000 },
	});
	if (!res.ok) {
  	return NextResponse.json({ error: "No se pudo traer la imagen" }, { status: 502 });
	}
	return new NextResponse(res.body, {
  	headers: {
    	"Content-Type": res.headers.get("content-type") || "image/jpeg",
    	"Cache-Control": CACHE,
  	},
	});
  } catch (err) {
	console.error("imagen-carta:", err);
	return NextResponse.json({ error: "No se pudo traer la imagen" }, { status: 502 });
  }
}
