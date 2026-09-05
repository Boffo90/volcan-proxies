/**
 * Trae el catálogo de Riftbound a nuestra base.
 *
 *   node scripts/sync-riftbound.mjs
 *
 * CORRE DESDE TU MÁQUINA, no desde Vercel. Riftcodex está detrás de Cloudflare
 * y responde 403 al tráfico de datacenter: desde tu IP de casa pasa, desde los
 * servidores del sitio no. Esa es toda la razón de que este script exista.
 *
 * Antes de la primera vez hay que correr la migración
 * `supabase/migrations/20260905_riftbound_cartas.sql` en el SQL Editor.
 *
 * Se puede correr las veces que haga falta: reemplaza lo que cambió, agrega lo
 * nuevo y borra lo que Riftcodex ya no tiene. Vale la pena cuando sale un set.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const API = "https://api.riftcodex.com";
const POR_PAGINA = 100; // su tope: con 200 devuelve una lista vacía
const PAUSA_MS = 250; // no golpear a un proyecto de fans

// --------------------------------------------------------------------------

/** Lee .env.local sin dependencias: es el mismo archivo que usa `next dev`. */
function cargarEnv() {
  let texto;
  try {
    texto = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    salir("No encontré .env.local en la raíz del proyecto.");
  }
  const env = {};
  for (const linea of texto.split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function salir(mensaje) {
  console.error(`\n  ${mensaje}\n`);
  process.exit(1);
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Sin tildes ni mayúsculas, para que "jinx rebel" encuentre "Jinx - Rebel". */
function normalizar(nombre) {
  return (nombre || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

async function traerPagina(page) {
  const url = `${API}/cards?size=${POR_PAGINA}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "VolcanProxies/1.0 (+https://volcanproxies.cl)",
      Accept: "application/json",
    },
  });
  if (res.status === 403) {
    salir(
      "Riftcodex respondió 403.\n" +
        "  Eso es el bloqueo de Cloudflare al tráfico de datacenter: este\n" +
        "  script tiene que correr desde tu conexión de casa, no desde un\n" +
        "  servidor ni detrás de una VPN."
    );
  }
  if (!res.ok) salir(`Riftcodex respondió ${res.status} en la página ${page}.`);
  return res.json();
}

// --------------------------------------------------------------------------

async function main() {
  const env = cargarEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    salir("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  console.log("\n  Trayendo el catálogo de Riftbound…\n");

  const primera = await traerPagina(1);
  const total = primera.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  console.log(`  ${total} cartas en ${paginas} páginas`);

  const cartas = [...(primera.items ?? [])];
  for (let page = 2; page <= paginas; page++) {
    await dormir(PAUSA_MS);
    const p = await traerPagina(page);
    cartas.push(...(p.items ?? []));
    process.stdout.write(`\r  descargadas ${cartas.length}/${total}   `);
  }
  console.log(`\r  descargadas ${cartas.length}/${total}   `);

  // Las que no tienen imagen no sirven para imprimir y serían un hueco en la
  // grilla: se descartan acá y no en cada visita al sitio.
  const usables = cartas.filter((c) => c?.id && c?.media?.image_url);
  const descartadas = cartas.length - usables.length;
  if (descartadas > 0) {
    console.log(`  ${descartadas} sin imagen, descartadas`);
  }
  if (!usables.length) salir("No llegó ninguna carta usable; no toco la base.");

  const filas = usables.map((c) => ({
    id: String(c.id),
    nombre: c.name ?? "?",
    nombre_busqueda: normalizar(c.name),
    set_id: c.set?.set_id ?? null,
    datos: c,
    actualizado_at: new Date().toISOString(),
  }));

  console.log(`  guardando ${filas.length}…`);
  for (let i = 0; i < filas.length; i += 500) {
    const lote = filas.slice(i, i + 500);
    const { error } = await sb.from("riftbound_cartas").upsert(lote, {
      onConflict: "id",
    });
    if (error) salir(`Supabase falló al guardar: ${error.message}`);
    process.stdout.write(`\r  guardadas ${Math.min(i + 500, filas.length)}/${filas.length}   `);
  }
  console.log();

  // Lo que Riftcodex ya no tiene se va. Se borra al final y solo si la
  // descarga salió completa, para no vaciar la base por una caída a medias.
  const vivos = new Set(filas.map((f) => f.id));
  const { data: guardados, error: errLeer } = await sb
    .from("riftbound_cartas")
    .select("id");
  if (errLeer) salir(`Supabase falló al leer: ${errLeer.message}`);

  const sobrantes = (guardados ?? [])
    .map((r) => r.id)
    .filter((id) => !vivos.has(id));
  if (sobrantes.length) {
    const { error } = await sb
      .from("riftbound_cartas")
      .delete()
      .in("id", sobrantes);
    if (error) salir(`Supabase falló al borrar: ${error.message}`);
    console.log(`  ${sobrantes.length} que ya no existen, borradas`);
  }

  console.log(`\n  Listo: ${filas.length} cartas de Riftbound en la base.\n`);
}

main().catch((e) => salir(e?.message ?? String(e)));
