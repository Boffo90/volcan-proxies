// Trae las listas de los mazos listos desde su fuente y las deja en
// data/mazos/<slug>.txt. Después hay que correr scripts/build-mazos.mjs, que
// las valida y arma lo que usa el sitio.
//
//   node scripts/fetch-mazos.mjs            todos los de data/mazos/fuentes.json
//   node scripts/fetch-mazos.mjs kinnan     solo ese
//
// Qué mazos hay y de dónde sale cada uno lo dice data/mazos/fuentes.json:
//
//   { "slug": "kinnan", "fuente": "edhtop16", "comandante": "Kinnan, Bonder Prodigy" }
//   { "slug": "krenko", "fuente": "edhrec",   "edhrec": "krenko-mob-boss" }
//
// - edhtop16: la lista que mejor quedó con ese comandante en el último año,
//   en torneos de 50 jugadores o más (es el orden por defecto de su página).
//   Para una pareja de partners, el nombre va como lo escribe edhtop16:
//   "Kraum, Ludevic's Opus / Tymna the Weaver", en orden alfabético.
// - edhrec: el mazo promedio de ese comandante en Bracket 3 ("upgraded").
//
// Solo se reescribe la lista y las líneas "fuente:" de la cabecera. El nombre,
// el arquetipo y los textos de "juega" y "gana" son nuestros y no se tocan:
// si el archivo no existe se crea con esos campos vacíos, y build-mazos.mjs
// se niega a publicarlo hasta que alguien los escriba.
//
// Se lee lo que esos sitios publican en sus páginas, con un cliente que se
// identifica y una petición por segundo. Sus robots.txt lo permiten; si algún
// día lo prohíben o empiezan a rechazar, no se insiste ni se disfraza.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(RAIZ, "data", "mazos");
const UA = { "User-Agent": "mazos-build/1.0" };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

async function traer(url) {
  const res = await fetch(url, { headers: UA });
  await espera(1000);
  if (!res.ok) throw new Error(`${res.status} en ${url}`);
  return res.text();
}

/** Un texto tal como viene dentro de un JSON incrustado en la página. */
const deJson = (s) => JSON.parse('"' + s + '"');

/**
 * La mejor lista de un comandante en edhtop16.
 *
 * Su página trae los datos ya incrustados (es una app que se hidrata), así
 * que se leen de ahí: primero los resultados del comandante, y de la página
 * del resultado elegido, sus cartas.
 */
async function deEdhtop16(comandante) {
  const pagina = (
    await traer("https://edhtop16.com/commander/" + encodeURIComponent(comandante))
  ).replace(/\\"/g, '"');

  const entrada = pagina.match(
    /"standing":(\d+),"wins":\d+,"losses":\d+,"draws":\d+,"decklist":"[^"]*","decklistUrl":"([^"]+)"[\s\S]*?"tournament":\{"name":"((?:[^"\\]|\\.)*)","size":(\d+),"tournamentDate":"([^"]+)"/
  );
  if (!entrada) throw new Error(`edhtop16 no muestra resultados para "${comandante}"`);
  const [, puesto, ruta, torneo, jugadores, fecha] = entrada;

  const url = "https://edhtop16.com" + deJson(ruta);
  const lista = (await traer(url)).replace(/\\"/g, '"');
  const cartas = [];
  const re =
    /"count":(\d+),"spice":[^,]*,"commanderPlayRate":[^,]*,"card":\{"id":"[^"]*","name":"((?:[^"\\]|\\.)*)"/g;
  for (const m of lista.matchAll(re)) cartas.push({ q: Number(m[1]), n: deJson(m[2]) });
  if (cartas.length < 50) throw new Error(`No se pudo leer la lista en ${url}`);

  const d = new Date(fecha);
  return {
    comandantes: comandante.split(" / ").map((c) => c.split(" // ")[0].trim()),
    cartas,
    fuente:
      `${puesto}.º lugar en ${deJson(torneo).trim()} (${jugadores} jugadores, ` +
      `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}), vía edhtop16.com`,
    fuenteUrl: url,
  };
}

/** El mazo promedio de Bracket 3 de un comandante en EDHREC. */
async function deEdhrec(slug) {
  const json = JSON.parse(
    await traer(`https://json.edhrec.com/pages/average-decks/${slug}/upgraded.json`)
  );
  const cartas = [];
  for (const grupo of Object.values(json.deck?.cards ?? {})) {
    for (const [n, q] of grupo) cartas.push({ q, n });
  }
  if (cartas.length < 50) throw new Error(`EDHREC no trae lista para ${slug}`);
  const mazos = json.bracket_counts?.["3"];
  return {
    comandantes: json.deck.commander,
    cartas,
    fuente:
      "Mazo promedio de Bracket 3 en EDHREC" +
      (mazos ? ` (sobre ${mazos.toLocaleString("es-CL")} mazos)` : ""),
    fuenteUrl: `https://edhrec.com/average-decks/${slug}/upgraded`,
  };
}

const VACIA = ["nombre: ", "formato: ", "arquetipo: ", "comandantes: ", "juega: ", "gana: "];

async function escribir(def, datos) {
  const archivo = path.join(DIR, def.slug + ".txt");
  const previa = existsSync(archivo)
    ? (await readFile(archivo, "utf8")).replace(/\r\n/g, "\n").split(/\n---\n/)[0].split("\n")
    : VACIA;

  // La cabecera se conserva salvo tres líneas que sí vienen de la fuente.
  const cabecera = previa.filter((l) => !/^(fuente|fuenteUrl):/.test(l) && l.trim());
  const poner = (clave, valor) => {
    const i = cabecera.findIndex((l) => l.startsWith(clave + ":"));
    if (i >= 0) cabecera[i] = `${clave}: ${valor}`;
    else cabecera.push(`${clave}: ${valor}`);
  };
  poner("formato", def.fuente === "edhtop16" ? "cedh" : "b3");
  poner("comandantes", datos.comandantes.join(" + "));
  cabecera.push(`fuente: ${datos.fuente}`, `fuenteUrl: ${datos.fuenteUrl}`);

  // Los comandantes no van en la lista: tienen su línea propia.
  const jefes = new Set(datos.comandantes.map((c) => c.toLowerCase()));
  const lista = datos.cartas
    .filter((c) => !jefes.has(c.n.split(" // ")[0].toLowerCase()))
    .map((c) => `${c.q} ${c.n}`);

  await writeFile(archivo, [...cabecera, "---", ...lista, ""].join("\n"));
  const total = datos.comandantes.length + lista.reduce((s, l) => s + parseInt(l, 10), 0);
  console.log(`${def.slug}: ${total} cartas · ${datos.fuente}`);
}

const fuentes = JSON.parse(await readFile(path.join(DIR, "fuentes.json"), "utf8"));
const pedidos = process.argv.slice(2);
let fallos = 0;
for (const def of fuentes) {
  if (pedidos.length && !pedidos.includes(def.slug)) continue;
  try {
    const datos =
      def.fuente === "edhtop16" ? await deEdhtop16(def.comandante) : await deEdhrec(def.edhrec);
    await escribir(def, datos);
  } catch (e) {
    fallos++;
    console.log(`✗ ${def.slug}: ${e.message}`);
  }
}
if (fallos) process.exit(1);
