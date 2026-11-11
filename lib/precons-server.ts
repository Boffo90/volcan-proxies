import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Precon } from "./precons";

/**
 * Las cartas de un precon, leídas del archivo.
 *
 * Solo se llama al construir: las páginas de los mazos se generan todas en el
 * build (`generateStaticParams` con `dynamicParams = false`), así que en
 * producción esto no corre nunca dentro de una función.
 */
export async function leerPrecon(set: string, slug: string): Promise<Precon | null> {
  // Los dos vienen de la URL. Sin esto, "..%2F" saldría de la carpeta.
  if (!/^[a-z0-9]+$/.test(set) || !/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const archivo = path.join(process.cwd(), "public", "precons", set, slug + ".json");
    return JSON.parse(await readFile(archivo, "utf8")) as Precon;
  } catch {
    return null;
  }
}
