// Arma los "mazos listos" a partir de las listas de data/mazos/*.txt.
//
//   node scripts/build-mazos.mjs            valida y escribe
//   node scripts/build-mazos.mjs --check    solo valida, sin escribir
//
// Agregar un mazo es crear un .txt en data/mazos/ (el nombre del archivo es
// su dirección: kinnan.txt -> /mazos/kinnan) y correr esto. La cabecera lleva
// nombre, formato (cedh | b3), arquetipo, comandantes (con " + " si son dos),
// "juega:" y una o más líneas "gana:"; después de "---" va la lista.
//
// Una lista que no cumple las reglas NO se escribe. Es a propósito: un mazo
// de 99 cartas, con una carta fuera de color o prohibida, es un producto
// malo que el cliente descubre recién al jugarlo.
//
// Deja:
//   data/mazos-index.json        el listado, para /mazos
//   public/mazos/<slug>.json     las cartas, con la misma forma de un precon,
//                                más sus combos según Commander Spellbook

import { mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRYFALL = "https://api.scryfall.com";
const UA = { "User-Agent": "mazos-build/1.0", Accept: "application/json" };
const SOLO_VALIDAR = process.argv.includes("--check");

// La búsqueda de Scryfall aguanta dos por segundo y bloquea un minuto al
// pasarse. Ver scripts/sync-precons.mjs.
const PAUSA_BUSQUEDA = 600;
const MAX_GAME_CHANGERS_B3 = 3;
const FORMATOS = { cedh: "cEDH", b3: "Bracket 3" };

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url, opciones = {}, intentos = 6) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { ...opciones, headers: { ...UA, ...opciones.headers } });
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
    await espera(500 * (i + 1));
  }
  throw new Error("No respondió: " + url);
}

/** Sin tildes, mayúsculas ni puntuación: para comparar nombres. */
const plano = (v) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function leerFuente(texto, slug) {
  const [cabecera, cuerpo] = texto.replace(/\r\n/g, "\n").split(/\n---\n/);
  if (cuerpo === undefined) throw new Error(`${slug}: falta la línea "---"`);
  const meta = { gana: [] };
  for (const linea of cabecera.split("\n")) {
    const m = linea.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    if (m[1] === "gana") meta.gana.push(m[2].trim());
    else meta[m[1]] = m[2].trim();
  }
  const cartas = [];
  for (const linea of cuerpo.split("\n")) {
    const m = linea.trim().match(/^(\d+)x?\s+(.+)$/);
    if (m) cartas.push({ q: Number(m[1]), n: m[2].trim() });
  }
  return {
    slug,
    ...meta,
    comandantes: (meta.comandantes ?? "").split(" + ").map((c) => c.trim()).filter(Boolean),
    cartas,
  };
}

/** nombre -> carta de Scryfall, pidiendo de a 75. */
async function resolver(nombres) {
  const porNombre = new Map();
  const faltan = [];
  for (let i = 0; i < nombres.length; i += 75) {
    const lote = nombres.slice(i, i + 75);
    const res = await pedir(`${SCRYFALL}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Una carta de dos caras o partida ("Dead // Gone") se pide por la
      // primera mitad: con el nombre completo Scryfall no la encuentra acá.
      body: JSON.stringify({
        identifiers: lote.map((name) => ({ name: name.split(" // ")[0] })),
      }),
    });
    await espera(150);
    for (const c of res?.data ?? []) {
      porNombre.set(plano(c.name), c);
      // Una carta de dos caras se pide por la primera.
      for (const cara of c.card_faces ?? []) {
        if (!porNombre.has(plano(cara.name))) porNombre.set(plano(cara.name), c);
      }
    }
    for (const nf of res?.not_found ?? []) faltan.push(nf.name);
  }
  // Las que no aparecieron por nombre exacto, una por una y por aproximación:
  // las fuentes no siempre escriben igual los apóstrofos y las tildes.
  const sinResolver = [];
  for (const nombre of faltan) {
    const c = await pedir(
      `${SCRYFALL}/cards/named?fuzzy=${encodeURIComponent(nombre)}`
    );
    await espera(150);
    if (c?.name) {
      porNombre.set(plano(nombre), c);
      porNombre.set(plano(c.name), c);
    } else sinResolver.push(nombre);
  }
  return { porNombre, faltan: sinResolver };
}

function grupo(typeLine) {
  const t = (typeLine ?? "").split("//")[0];
  if (t.includes("Land")) return "tierra";
  if (t.includes("Creature")) return "criatura";
  if (t.includes("Planeswalker")) return "planeswalker";
  if (t.includes("Battle")) return "batalla";
  if (t.includes("Instant")) return "instantaneo";
  if (t.includes("Sorcery")) return "conjuro";
  if (t.includes("Artifact")) return "artefacto";
  if (t.includes("Enchantment")) return "encantamiento";
  return "otro";
}

const esBasica = (c) => (c.type_line ?? "").includes("Basic");
// Nazgûl, Relentless Rats y compañía: su propio texto permite repetirlas.
const admiteCopias = (c) => /A deck can have (any number of|up to \w+) cards named/.test(c.oracle_text ?? "");
const imprimible = (c) => c.image_status !== "placeholder" && c.image_status !== "missing";

/** oracle_id -> id de una impresión en español. */
async function enEspanol(oracleIds) {
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
      const res = await pedir(url);
      await espera(PAUSA_BUSQUEDA);
      if (!res) break;
      for (const c of res.data ?? []) {
        if (!imprimible(c)) continue;
        if (c.image_status === "highres_scan") {
          if (!mapa.has(c.oracle_id)) mapa.set(c.oracle_id, c.id);
        } else if (!respaldo.has(c.oracle_id)) {
          respaldo.set(c.oracle_id, c.id);
        }
      }
      url = res.has_more ? res.next_page : null;
    }
    process.stdout.write(`\respañol ${Math.min(i + 20, oracleIds.length)}/${oracleIds.length}`);
  }
  console.log();
  for (const [o, id] of respaldo) if (!mapa.has(o)) mapa.set(o, id);
  return mapa;
}

// --- Combos -----------------------------------------------------------------
//
// Los combos de cada lista salen de Commander Spellbook, que es la base de
// datos de combos de Commander: se le manda el mazo y devuelve los que están
// completos adentro. Así el "cómo gana" que escribimos nosotros queda
// respaldado por un dato que no depende de la memoria de nadie.

const SPELLBOOK = "https://backend.commanderspellbook.com/find-my-combos";
const MAX_COMBOS = 8;

// Lo que produce un combo, en castellano. Spellbook lo escribe en inglés y con
// un vocabulario acotado; lo que no esté acá se muestra tal como viene, que es
// mejor que inventarle una traducción.
const RESULTADOS = {
  "Infinite creature ETB": "criaturas que entran infinitas veces",
  "Infinite creature LTB": "criaturas que salen infinitas veces",
  "Infinite artifact ETB": "artefactos que entran infinitas veces",
  "Infinite artifact LTB": "artefactos que salen infinitas veces",
  "Infinite storm count": "tormenta infinita",
  "Near-infinite storm count": "tormenta casi infinita",
  "Infinite death triggers": "muertes infinitas",
  "Infinite creature sacrifice triggers": "sacrificios de criatura infinitos",
  "Infinite artifact sacrifice triggers": "sacrificios de artefacto infinitos",
  "Infinite lifegain": "vida infinita",
  "Infinite lifegain triggers": "ganancias de vida infinitas",
  "Infinite lifeloss": "pérdida de vida infinita",
  "Infinite damage": "daño infinito",
  "Near-infinite damage": "daño casi infinito",
  "Infinite colorless mana": "maná incoloro infinito",
  "Near-infinite colorless mana": "maná incoloro casi infinito",
  "Infinite colored mana": "maná de color infinito",
  "Near-infinite colored mana": "maná de color casi infinito",
  "Infinite red mana": "maná rojo infinito",
  "Infinite green mana": "maná verde infinito",
  "Infinite blue mana": "maná azul infinito",
  "Infinite black mana": "maná negro infinito",
  "Infinite white mana": "maná blanco infinito",
  "Infinite card draw": "robo infinito",
  "Infinite card draw for all players": "robo infinito para todos",
  "Infinite draw triggers": "robos infinitos",
  "Infinite draw triggers for all players": "robos infinitos para todos",
  "Infinite self-mill": "moler la propia biblioteca",
  "Near-infinite mill": "moler casi infinito",
  "Infinite mill": "moler infinito",
  "Infinite creature tokens": "fichas de criatura infinitas",
  "Infinite creature tokens with haste": "fichas de criatura con prisa infinitas",
  "Infinite artifact tokens": "fichas de artefacto infinitas",
  "Infinite Treasure tokens": "Tesoros infinitos",
  "Near-infinite Treasure tokens": "Tesoros casi infinitos",
  "Infinite tapped Treasure tokens": "Tesoros girados infinitos",
  "Infinite magecraft triggers": "disparos de magecraft infinitos",
  "Near-infinite magecraft triggers": "disparos de magecraft casi infinitos",
  "Infinite landfall triggers": "disparos de landfall infinitos",
  "Infinite commander casts": "lanzar el comandante infinitas veces",
  "Infinite blinking": "parpadeos infinitos",
  "Infinite looting": "robar y descartar infinito",
  "Infinite untap of creatures you control": "enderezar tus criaturas infinitas veces",
  "Infinite untap of permanents you control": "enderezar tus permanentes infinitas veces",
  "Infinite untap of artifacts you control": "enderezar tus artefactos infinitas veces",
  "Infinite untap of lands you control": "enderezar tus tierras infinitas veces",
  "Infinite mana creatures you control can produce": "todo el maná que den tus criaturas, infinito",
  "Infinite mana lands you control can produce": "todo el maná que den tus tierras, infinito",
  "Infinite mana permanents you control can produce": "todo el maná que den tus permanentes, infinito",
  "Infinite mana artifacts you control can produce": "todo el maná que den tus artefactos, infinito",
  "Win the game": "ganas la partida",
  "Target opponent loses the game": "un oponente pierde la partida",
  "Each opponent loses the game": "cada oponente pierde la partida",
  "Exile your library": "exiliar tu biblioteca",
  "Destroy all creatures opponents control": "destruir las criaturas de los oponentes",
  "Destroy all artifacts opponents control": "destruir los artefactos de los oponentes",
  "Infinite looting for all players":
    "robar y descartar infinito para todos",
  "Infinite looting for opponents":
    "robar y descartar infinito para los oponentes",
  "Near-infinite mana among colors of legendary creatures and planeswalkers you control":
    "maná casi infinito de los colores de tus leyendas",
  "Infinite untap of legendary creatures you control":
    "enderezar tus criaturas legendarias infinitas veces",
  "Infinite mana legendary creatures you control can produce":
    "todo el maná que den tus criaturas legendarias, infinito",
  "Infinite colored mana that can only be spent to activate abilities":
    "maná de color infinito, solo para activar habilidades",
  Lock: "bloqueo de la mesa",
};

async function combosDe(m) {
  let res;
  try {
    res = await pedir(SPELLBOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commanders: m.comandantes.map((card) => ({ card, quantity: 1 })),
        main: m.cartas.map((c) => ({ card: c.n, quantity: c.q })),
      }),
    });
  } catch {
    // Sin Spellbook el mazo se publica igual, solo sin la sección de combos.
    return [];
  }
  await espera(1000);

  const vistos = new Set();
  return (res?.results?.included ?? [])
    // Los de una sola carta piden además "alguna otra pieza" que no nombran;
    // listarlos como combo del mazo sería prometer algo que no está completo.
    .filter((c) => c.uses.length >= 2)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .map((c) => ({
      id: c.id,
      cartas: c.uses.map((u) => u.card.name),
      produce: c.produces.map((p) => RESULTADOS[p.feature.name] ?? p.feature.name).slice(0, 3),
    }))
    .filter((c) => {
      const clave = [...c.cartas].sort().join("|");
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .slice(0, MAX_COMBOS);
}

// ---------------------------------------------------------------------------

const dirFuente = path.join(RAIZ, "data", "mazos");
const archivos = (await readdir(dirFuente)).filter((f) => f.endsWith(".txt")).sort();
const fuentes = [];
for (const f of archivos) {
  fuentes.push(leerFuente(await readFile(path.join(dirFuente, f), "utf8"), f.replace(/\.txt$/, "")));
}

const todos = new Set();
for (const m of fuentes) {
  m.comandantes.forEach((c) => todos.add(c));
  m.cartas.forEach((c) => todos.add(c.n));
}
const { porNombre, faltan } = await resolver([...todos]);

let errores = 0;
const armados = [];

for (const m of fuentes) {
  const problemas = [];
  const de = (nombre) => porNombre.get(plano(nombre));

  if (!FORMATOS[m.formato]) problemas.push(`formato "${m.formato}" desconocido`);
  for (const campo of ["nombre", "arquetipo", "juega"]) {
    if (!m[campo]) problemas.push(`falta "${campo}:"`);
  }
  if (!m.gana.length) problemas.push('falta al menos un "gana:"');
  if (!m.comandantes.length) problemas.push('falta "comandantes:"');

  const comandantes = m.comandantes.map(de);
  const noEsta = [...m.comandantes, ...m.cartas.map((c) => c.n)].filter((n) => !de(n));
  if (noEsta.length) problemas.push("no existen: " + noEsta.join(" | "));

  const identidad = new Set(comandantes.flatMap((c) => c?.color_identity ?? []));
  const total =
    m.comandantes.length + m.cartas.reduce((s, c) => s + c.q, 0);
  if (total !== 100) problemas.push(`tiene ${total} cartas, no 100`);

  const vistas = new Set(m.comandantes.map(plano));
  for (const c of m.cartas) {
    const sc = de(c.n);
    if (!sc) continue;
    const clave = plano(sc.name);
    if (vistas.has(clave)) problemas.push(`repetida: ${sc.name}`);
    vistas.add(clave);
    if (c.q > 1 && !esBasica(sc) && !admiteCopias(sc)) problemas.push(`${c.q} copias de ${sc.name}`);
    const fuera = (sc.color_identity ?? []).filter((x) => !identidad.has(x));
    if (fuera.length) problemas.push(`fuera de color: ${sc.name} (${fuera.join("")})`);
    if (sc.legalities?.commander !== "legal") {
      problemas.push(`no es legal en Commander: ${sc.name} (${sc.legalities?.commander})`);
    }
  }
  for (const c of comandantes) {
    if (c && c.legalities?.commander !== "legal") {
      problemas.push(`comandante no legal: ${c.name}`);
    }
  }

  // Un "cómo gana" que nombra una carta que el mazo no trae es una promesa
  // falsa. Las listas se refrescan desde su fuente y pueden perderla.
  const enLista = new Set(
    [...m.comandantes, ...m.cartas.map((c) => c.n)].flatMap((n) => {
      const sc = de(n);
      return sc ? [sc.name, ...(sc.card_faces ?? []).map((f) => f.name)] : [];
    })
  );
  for (const g of m.gana) {
    for (const [nombre] of g.matchAll(/[A-Z][\w'’-]+(?:,? (?:of|the|to|and|de|[A-Z][\w'’-]+))*/g)) {
      const limpio = nombre.replace(/[,.]$/, "");
      const sc = porNombre.get(plano(limpio));
      if (sc && !enLista.has(sc.name)) problemas.push(`"gana" nombra ${sc.name}, que no está en la lista`);
    }
  }

  const gameChangers = [...m.comandantes, ...m.cartas.map((c) => c.n)]
    .map(de)
    .filter((c) => c?.game_changer)
    .map((c) => c.name);
  if (m.formato === "b3" && gameChangers.length > MAX_GAME_CHANGERS_B3) {
    problemas.push(
      `Bracket 3 admite ${MAX_GAME_CHANGERS_B3} Game Changers y tiene ${gameChangers.length}: ` +
        gameChangers.join(", ")
    );
  }

  const tierras = m.cartas.filter((c) => grupo(de(c.n)?.type_line) === "tierra").reduce((s, c) => s + c.q, 0);
  console.log(
    `${problemas.length ? "✗" : "✓"} ${m.slug}: ${total} cartas, ${tierras} tierras, ` +
      `${gameChangers.length} game changers`
  );
  for (const p of problemas) console.log("    - " + p);
  errores += problemas.length;
  if (!problemas.length) armados.push({ m, comandantes, gameChangers, tierras, total });
}

if (faltan.length && !errores) console.log("Scryfall no encontró: " + faltan.join(" | "));
if (errores) {
  console.log(`\n${errores} problema(s). No se escribió nada.`);
  process.exit(1);
}
if (SOLO_VALIDAR) {
  console.log("\nTodo válido. (--check: no se escribió nada)");
  process.exit(0);
}

// --- Tokens y español -------------------------------------------------------

const idsToken = new Set();
const oracles = new Set();
for (const { m } of armados) {
  for (const n of [...m.comandantes, ...m.cartas.map((c) => c.n)]) {
    const sc = porNombre.get(plano(n));
    oracles.add(sc.oracle_id);
    for (const p of sc.all_parts ?? []) if (p.component === "token") idsToken.add(p.id);
  }
}

const tokensPorId = new Map();
const listaTokens = [...idsToken];
for (let i = 0; i < listaTokens.length; i += 75) {
  const res = await pedir(`${SCRYFALL}/cards/collection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifiers: listaTokens.slice(i, i + 75).map((id) => ({ id })) }),
  });
  await espera(150);
  for (const c of res?.data ?? []) tokensPorId.set(c.id, c);
}

const es = await enEspanol([...oracles]);

// --- Escribir ---------------------------------------------------------------

const dirSalida = path.join(RAIZ, "public", "mazos");
await rm(dirSalida, { recursive: true, force: true });
await mkdir(dirSalida, { recursive: true });
const indice = [];

for (const { m, comandantes, gameChangers, tierras, total } of armados) {
  const aCarta = (sc, q, t) => {
    const o = { n: sc.name, q, id: sc.id, s: sc.set, c: sc.collector_number, t: t ?? grupo(sc.type_line) };
    const idEs = es.get(sc.oracle_id);
    if (idEs) {
      o.es = idEs;
      o.esOtra = 1;
    }
    return o;
  };
  const cartas = [
    ...comandantes.map((sc) => aCarta(sc, 1, "comandante")),
    ...m.cartas.map((c) => aCarta(porNombre.get(plano(c.n)), c.q)),
  ];

  // Un token por tipo (oracle_id), no uno por cada impresión.
  const vistos = new Set();
  const tokens = [];
  for (const n of [...m.comandantes, ...m.cartas.map((c) => c.n)]) {
    for (const p of porNombre.get(plano(n)).all_parts ?? []) {
      const t = p.component === "token" ? tokensPorId.get(p.id) : null;
      if (!t || !imprimible(t) || vistos.has(t.oracle_id)) continue;
      vistos.add(t.oracle_id);
      tokens.push({ n: t.name, id: t.id, s: t.set, c: t.collector_number });
    }
  }
  tokens.sort((a, b) => a.n.localeCompare(b.n));

  // La curva: valor de maná promedio de lo que no es tierra.
  const noTierras = cartas.filter((c) => c.t !== "tierra");
  const sumaCmc = [...comandantes, ...m.cartas.map((c) => porNombre.get(plano(c.n)))]
    .filter((sc) => grupo(sc.type_line) !== "tierra")
    .reduce((s, sc) => s + (sc.cmc ?? 0), 0);
  const curva = Math.round((sumaCmc / noTierras.reduce((s, c) => s + c.q, 0)) * 100) / 100;

  const combos = await combosDe(m);

  const identidad = new Set(comandantes.flatMap((c) => c.color_identity ?? []));
  const resumen = {
    slug: m.slug,
    nombre: m.nombre,
    formato: m.formato,
    arquetipo: m.arquetipo,
    comandantes: comandantes.map((c) => ({ n: c.name, id: c.id })),
    colores: ["W", "U", "B", "R", "G"].filter((c) => identidad.has(c)),
    total,
    enEs: cartas.reduce((s, c) => s + (c.es ? c.q : 0), 0),
    tokens: tokens.length,
    tierras,
    curva,
    gameChangers: gameChangers.length,
  };
  indice.push(resumen);
  await writeFile(
    path.join(dirSalida, m.slug + ".json"),
    JSON.stringify({
      ...resumen,
      juega: m.juega,
      gana: m.gana,
      // De dónde salió la lista, para decirlo en la página.
      fuente: m.fuente ?? "",
      fuenteUrl: m.fuenteUrl ?? "",
      combos,
      gameChangers,
      tokens,
      cartas,
    })
  );
}

// cEDH primero, y dentro de cada formato por nombre.
indice.sort(
  (a, b) => a.formato.localeCompare(b.formato) * -1 || a.nombre.localeCompare(b.nombre)
);
await writeFile(path.join(RAIZ, "data", "mazos-index.json"), JSON.stringify(indice, null, 1));
console.log(`${indice.length} mazos escritos.`);
