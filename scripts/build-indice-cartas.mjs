// Arma el índice que deja buscar un mazo por las cartas que trae
// ("¿qué precon trae Cyclonic Rift?").
//
//   node scripts/build-indice-cartas.mjs
//
// No hace falta correrlo a mano: sync-precons.mjs y build-mazos.mjs lo llaman
// al terminar. Lee los mazos ya escritos en public/ y deja, junto a ellos:
//
//   public/precons/_cartas.json
//   public/mazos/_cartas.json
//
// Va aparte del listado a propósito. Los nombres de las cartas de 186 mazos
// pesan diez veces más que el listado mismo, y la mayoría de las visitas no
// busca por carta: el navegador lo pide recién cuando alguien usa el buscador.
//
// La forma es compacta por lo mismo: cada nombre va una sola vez y cada mazo
// guarda números. Sol Ring está en casi todos los mazos.
//
//   { "cartas": ["Sol Ring", …], "mazos": { "fdc/reign-of-dragons": [0, 14, …] } }

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function archivosDe(dir) {
  const salida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...(await archivosDe(ruta)));
    else if (e.name.endsWith(".json") && !e.name.startsWith("_")) salida.push(ruta);
  }
  return salida;
}

async function indexar(carpeta) {
  const dir = path.join(RAIZ, "public", carpeta);
  const cartas = [];
  const numero = new Map();
  const mazos = {};
  for (const archivo of (await archivosDe(dir)).sort()) {
    const mazo = JSON.parse(await readFile(archivo, "utf8"));
    // La clave es la dirección del mazo sin la carpeta: "fdc/reign-of-dragons".
    const clave = path.relative(dir, archivo).replace(/\\/g, "/").replace(/\.json$/, "");
    mazos[clave] = [...new Set((mazo.cartas ?? []).map((c) => c.n))].map((n) => {
      if (!numero.has(n)) {
        numero.set(n, cartas.length);
        cartas.push(n);
      }
      return numero.get(n);
    });
  }
  await writeFile(path.join(dir, "_cartas.json"), JSON.stringify({ cartas, mazos }));
  console.log(`${carpeta}: ${Object.keys(mazos).length} mazos, ${cartas.length} cartas distintas`);
}

await indexar("precons");
await indexar("mazos");
