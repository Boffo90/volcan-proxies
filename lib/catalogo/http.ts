/**
 * El fetch que usan los catálogos.
 *
 * Existe por una caída real: el 4 de septiembre de 2026 la API de TCGdex dejó
 * de responder — no rechazaba la conexión, simplemente no contestaba nunca. Un
 * `fetch` sin plazo se queda esperando hasta que Vercel corta la función, así
 * que una API ajena colgada se convierte en nuestra página colgada.
 *
 * Con plazo, el catálogo caído falla rápido, `/api/catalogo` devuelve vacío y
 * el cliente ve "no se encontraron cartas" en vez de un spinner eterno.
 */

/**
 * Ocho segundos.
 *
 * Estas APIs contestan en menos de uno cuando están sanas (Scryfall 0,7 s,
 * Riftcodex 0,6 s medidos). Ocho da aire para un pico y sigue estando muy
 * por debajo del límite de una función de Vercel.
 */
export const TIMEOUT_MS = 8000;

export type OpcionesCatalogo = {
  headers?: Record<string, string>;
  /** Segundos que el CDN puede cachear la respuesta. */
  revalidate?: number;
  timeoutMs?: number;
};

export class CatalogoCaidoError extends Error {}

/** GET con plazo. Lanza `CatalogoCaidoError` si el otro lado no contesta. */
export async function pedirJson<T>(
  url: string,
  opciones: OpcionesCatalogo = {}
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const { headers, revalidate = 3600, timeoutMs = TIMEOUT_MS } = opciones;
  const corte = AbortSignal.timeout(timeoutMs);

  let res: Response;
  try {
	res = await fetch(url, {
  	headers,
  	signal: corte,
  	next: { revalidate },
	});
  } catch (err) {
	// Da igual si fue el plazo o la red: para quien llama es lo mismo, el
	// catálogo no está.
	const motivo = err instanceof Error ? err.message : String(err);
	throw new CatalogoCaidoError(`No respondió: ${motivo}`);
  }

  if (!res.ok) return { ok: false, status: res.status, data: null };
  try {
	return { ok: true, status: res.status, data: (await res.json()) as T };
  } catch {
	throw new CatalogoCaidoError("Respondió algo que no es JSON");
  }
}
