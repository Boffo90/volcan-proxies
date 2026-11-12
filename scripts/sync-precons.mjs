// Baja los mazos preconstruidos de Commander y los deja como archivos del sitio.
//
//   node scripts/sync-precons.mjs
//
// Hay que volver a correrlo cuando salga un producto de Commander nuevo, y
// después hacer commit de lo que cambió: los mazos viven en el repo, no en la
// base, así que la página de un precon no depende de ninguna API al mostrarse.
//
// De dónde sale cada cosa:
//   - Las listas, de MTGJSON (mtgjson.com), que publica el contenido oficial
//     de cada producto con el id de Scryfall de cada impresión.
//   - Qué cartas existen en español, de Scryfall, en dos pasadas. Primero la
//     misma impresión del producto (se pregunta por set y se cruza por número
//     de coleccionista). Para las que no, cualquier otra impresión de esa
//     carta que sí haya salido en español: a quien pide el mazo en español le
//     importa poder leer la carta más que de qué edición viene. Se guarda el
//     id de la impresión española, así el importador la pide directo y lo que
//     promete "español completo" es exactamente lo que después encuentra.
//
// Deja:
//   data/precons-index.json            el listado, liviano, para /precons
//   public/precons/<set>/<slug>.json   un archivo por mazo, con sus cartas

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MTGJSON = "https://mtgjson.com/api/v5";
const SCRYFALL = "https://api.scryfall.com";
const UA = { "User-Agent": "precons-sync/1.0", Accept: "application/json" };

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Scryfall limita la búsqueda mucho más que el resto de su API: dos por
// segundo, y al pasarse bloquea un minuto entero (y amenaza con bloquear la
// red si se insiste). Por eso cada búsqueda espera PAUSA_BUSQUEDA, y un 429
// se respeta esperando lo que piden antes de volver a intentar.
const PAUSA_BUSQUEDA = 600;

async function json(url, intentos = 6) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.status === 404) return null;
      if (res.ok) return await res.json();
      if (res.status === 429) {
        console.log("Scryfall pidió esperar; se retoma en 70 segundos…");
        await espera(70000);
        continue;
      }
    } catch {
      // reintenta
    }
    await espera(400 * (i + 1));
  }
  throw new Error("No respondió: " + url);
}

/** "Jump Scare!" -> "jump-scare" */
function slug(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * En qué grupo de la lista va una carta. El orden importa: una criatura
 * artefacto es criatura, y una tierra que además es otra cosa es tierra.
 */
function grupo(types) {
  const t = new Set(types || []);
  if (t.has("Land")) return "tierra";
  if (t.has("Creature")) return "criatura";
  if (t.has("Planeswalker")) return "planeswalker";
  if (t.has("Battle")) return "batalla";
  if (t.has("Instant")) return "instantaneo";
  if (t.has("Sorcery")) return "conjuro";
  if (t.has("Artifact")) return "artefacto";
  if (t.has("Enchantment")) return "encantamiento";
  return "otro";
}

const imprimible = (c) =>
  c.image_status !== "placeholder" && c.image_status !== "missing";

/** número de coleccionista -> id de la impresión en español, para un set. */
async function numerosEnEspanol(set) {
  const numeros = new Map();
  let url =
    `${SCRYFALL}/cards/search?unique=prints&include_extras=true&q=` +
    encodeURIComponent(`set:${set} lang:es`);
  while (url) {
    const res = await json(url);
    await espera(PAUSA_BUSQUEDA);
    if (!res) break;
    for (const c of res.data ?? []) {
      if (imprimible(c)) numeros.set(c.collector_number, c.id);
    }
    url = res.has_more ? res.next_page : null;
  }
  return numeros;
}

/**
 * Para las cartas cuya impresión no salió en español: oracle_id -> id de otra
 * impresión que sí. De a veinte por consulta, y la más nueva primero.
 */
async function otrasEnEspanol(oracleIds) {
  const mapa = new Map();
  const respaldo = new Map();
  for (let i = 0; i < oracleIds.length; i += 20) {
    const lote = oracleIds.slice(i, i + 20);
    let url =
      `${SCRYFALL}/cards/search?unique=prints&order=released&dir=desc&q=` +
      encodeURIComponent(
        "lang:es game:paper (" + lote.map((o) => "oracleid:" + o).join(" or ") + ")"
      );
    while (url) {
      const res = await json(url);
      await espera(PAUSA_BUSQUEDA);
      if (!res) break;
      for (const c of res.data ?? []) {
        if (!imprimible(c)) continue;
        // Una de alta resolución le gana a una más nueva pero mal escaneada.
        if (c.image_status === "highres_scan") {
          if (!mapa.has(c.oracle_id)) mapa.set(c.oracle_id, c.id);
        } else if (!respaldo.has(c.oracle_id)) {
          respaldo.set(c.oracle_id, c.id);
        }
      }
      url = res.has_more ? res.next_page : null;
    }
    process.stdout.write(`\rotras impresiones ${Math.min(i + 20, oracleIds.length)}/${oracleIds.length}`);
  }
  console.log();
  for (const [oracle, id] of respaldo) if (!mapa.has(oracle)) mapa.set(oracle, id);
  return mapa;
}

function carta(c, enEspanol, otras) {
  const set = c.setCode.toLowerCase();
  const o = {
    n: c.name,
    q: c.count ?? 1,
    id: c.identifiers?.scryfallId,
    s: set,
    c: c.number,
    t: grupo(c.types),
  };
  const misma = enEspanol.get(set)?.get(c.number);
  const otra = otras.get(c.identifiers?.scryfallOracleId);
  if (misma) o.es = misma;
  else if (otra) {
    o.es = otra;
    // Es otra edición: el arte o el marco pueden no ser los del producto.
    o.esOtra = 1;
  }
  return o;
}

const lista = (await json(`${MTGJSON}/DeckList.json`)).data.filter(
  (d) => d.type === "Commander Deck" && !/Collector's Edition/i.test(d.name)
);
console.log(`${lista.length} precons de Commander`);

const sets = (await json(`${MTGJSON}/SetList.json`)).data;
const nombreDeSet = new Map(sets.map((s) => [s.code, s.name]));

// 1. Los mazos, de a cinco.
const crudos = [];
for (let i = 0; i < lista.length; i += 5) {
  const lote = lista.slice(i, i + 5);
  const datos = await Promise.all(
    lote.map((d) => json(`${MTGJSON}/decks/${d.fileName}.json`))
  );
  datos.forEach((d, j) => d?.data && crudos.push({ meta: lote[j], deck: d.data }));
  process.stdout.write(`\rmazos ${crudos.length}/${lista.length}`);
}
console.log();

// La segunda cara de una carta doble viene como entrada aparte con el mismo
// id de Scryfall; es una sola carta de cartón.
const caraA = (c) => !c.side || c.side === "a";

// 2. Qué existe en español, set por set.
const setsUsados = new Set();
for (const { deck } of crudos) {
  for (const c of [...(deck.commander ?? []), ...(deck.mainBoard ?? [])]) {
    setsUsados.add(c.setCode.toLowerCase());
  }
}
const enEspanol = new Map();
let n = 0;
for (const set of setsUsados) {
  enEspanol.set(set, await numerosEnEspanol(set));
  process.stdout.write(`\respañol ${++n}/${setsUsados.size}`);
}
console.log();

// 2b. Las que no salieron en español en esa impresión: ¿en alguna otra?
const sinEs = new Set();
for (const { deck } of crudos) {
  for (const c of [...(deck.commander ?? []), ...(deck.mainBoard ?? [])]) {
    const oracle = c.identifiers?.scryfallOracleId;
    if (oracle && !enEspanol.get(c.setCode.toLowerCase())?.has(c.number)) sinEs.add(oracle);
  }
}
const otras = await otrasEnEspanol([...sinEs]);

// 3. Escribir.
const dirMazos = path.join(RAIZ, "public", "precons");
await rm(dirMazos, { recursive: true, force: true });
const indice = [];

for (const { meta, deck } of crudos) {
  const comandantes = (deck.commander ?? []).filter(caraA);
  const principales = (deck.mainBoard ?? []).filter(caraA);
  if (!comandantes.length || !principales.length) continue;

  const cartas = [
    ...comandantes.map((c) => ({ ...carta(c, enEspanol, otras), t: "comandante" })),
    ...principales.map((c) => carta(c, enEspanol, otras)),
  ].filter((c) => c.id);

  const vistos = new Set();
  const tokens = (deck.tokens ?? [])
    .filter(caraA)
    .filter((t) => {
      const id = t.identifiers?.scryfallId;
      if (!id || vistos.has(id)) return false;
      vistos.add(id);
      return true;
    })
    .map((t) => ({
      n: t.name,
      id: t.identifiers.scryfallId,
      s: t.setCode.toLowerCase(),
      c: t.number,
    }));

  const total = cartas.reduce((s, c) => s + c.q, 0);
  const enEs = cartas.reduce((s, c) => s + (c.es ? c.q : 0), 0);
  const colores = [...new Set(comandantes.flatMap((c) => c.colorIdentity ?? []))];
  const set = meta.code.toLowerCase();
  const resumen = {
    set,
    slug: slug(meta.name),
    nombre: meta.name,
    setNombre: nombreDeSet.get(meta.code) ?? meta.code,
    fecha: meta.releaseDate,
    comandantes: comandantes.map((c) => ({ n: c.name, id: c.identifiers.scryfallId })),
    colores: ["W", "U", "B", "R", "G"].filter((c) => colores.includes(c)),
    total,
    enEs,
    tokens: tokens.length,
    // Universes Beyond: Fallout, Doctor Who, Star Trek… Dos marcas porque ninguna
    // sola los cubre todos: el sello triangular es de los primeros productos, y
    // los nuevos traen sello ovalado con la etiqueta "universesbeyond".
    ub: comandantes.some(
      (c) =>
        c.securityStamp === "triangle" ||
        (c.promoTypes ?? []).includes("universesbeyond")
    ),
  };
  indice.push(resumen);

  const dir = path.join(dirMazos, set);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, resumen.slug + ".json"),
    JSON.stringify({ ...resumen, tokens, cartas })
  );
}

indice.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre));
await mkdir(path.join(RAIZ, "data"), { recursive: true });
await writeFile(
  path.join(RAIZ, "data", "precons-index.json"),
  JSON.stringify(indice, null, 1)
);

// Lo que necesita la portada, aparte: cuántos son y tres carátulas. Importar
// el índice entero ahí serían 70 KB de más en la página más visitada.
const recientes = [];
for (const d of indice) {
  // Uno por producto, para que no salgan tres mazos de la misma colección.
  if (d.ub || recientes.some((r) => r.set === d.set)) continue;
  recientes.push({ nombre: d.nombre, set: d.set, slug: d.slug, id: d.comandantes[0].id });
  if (recientes.length === 3) break;
}
await writeFile(
  path.join(RAIZ, "data", "precons-destacados.json"),
  JSON.stringify(
    {
      total: indice.length,
      desde: indice[indice.length - 1].fecha.slice(0, 4),
      destacados: recientes,
    },
    null,
    1
  )
);

const raros = indice.filter((d) => d.total !== 100);
console.log(`${indice.length} mazos escritos.`);
if (raros.length) {
  console.log(
    "Con un total distinto de 100: " +
      raros.map((d) => `${d.nombre} (${d.total})`).join(", ")
  );
}

// El índice para buscar mazos por carta sale de lo recién escrito.
await import("./build-indice-cartas.mjs");
