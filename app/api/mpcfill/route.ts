import { NextResponse } from "next/server";

// Proxy de búsqueda contra MPCFill (mpc-autofill). Corre server-side porque
// su API no expone CORS para otros dominios, y así además cacheamos la lista
// de fuentes (drives de la comunidad) entre búsquedas.

const MPC_BASE = "https://mpcfill.com/2";
const MAX_RESULTS = 24;

export type MpcCard = {
  id: string;
  name: string;
  dpi: number;
  language: string;
  thumb: string;
  download: string;
};

// Cache simple de fuentes en memoria del módulo (TTL 1 hora).
let cachedSources: Array<[number, boolean]> | null = null;
let sourcesAt = 0;
const SOURCES_TTL = 60 * 60 * 1000;

async function getSources(): Promise<Array<[number, boolean]>> {
  const now = Date.now();
  if (cachedSources && now - sourcesAt < SOURCES_TTL) return cachedSources;

  const res = await fetch(`${MPC_BASE}/sources/`, {
	next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`MPCFill sources ${res.status}`);
  const json = await res.json();
  cachedSources = Object.values(
	json.results as Record<string, { pk: number }>
  ).map((s) => [s.pk, true] as [number, boolean]);
  sourcesAt = now;
  return cachedSources;
}

async function search(
  query: string,
  sources: Array<[number, boolean]>,
  fuzzy: boolean
): Promise<string[]> {
  const res = await fetch(`${MPC_BASE}/editorSearch/`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
  	searchSettings: {
    	searchTypeSettings: {
      	searchType: fuzzy ? "fuzzy" : "precise",
      	fuzzySearch: fuzzy,
      	filterCardbacks: false,
    	},
    	sourceSettings: { sources },
    	filterSettings: {
      	minimumDPI: 0,
      	maximumDPI: 1500,
      	maximumSize: 30,
      	languages: [],
      	includesTags: [],
      	excludesTags: [],
    	},
  	},
  	queries: [{ query, cardType: "CARD" }],
	}),
  });
  if (!res.ok) throw new Error(`MPCFill search ${res.status}`);
  const json = await res.json();
  return json.results?.[query]?.CARD ?? [];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  if (q.length < 2) {
	return NextResponse.json({ error: "Consulta muy corta" }, { status: 400 });
  }

  try {
	const sources = await getSources();

	let ids = await search(q, sources, false);
	if (ids.length === 0) {
  	ids = await search(q, sources, true);
	}
	ids = ids.slice(0, MAX_RESULTS);

	if (ids.length === 0) {
  	return NextResponse.json({ cards: [] });
	}

	const cardsRes = await fetch(`${MPC_BASE}/cards/`, {
  	method: "POST",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({ cardIdentifiers: ids }),
	});
	if (!cardsRes.ok) throw new Error(`MPCFill cards ${cardsRes.status}`);
	const cardsJson = await cardsRes.json();

	const byId = cardsJson.results as Record<
  	string,
  	{
    	identifier: string;
    	name: string;
    	dpi: number;
    	language: string;
    	mediumThumbnailUrl: string;
    	downloadLink: string;
  	}
	>;

	// Mantener el orden de relevancia de la búsqueda.
	const cards: MpcCard[] = ids
  	.map((id) => byId[id])
  	.filter(Boolean)
  	.map((c) => ({
    	id: c.identifier,
    	name: c.name,
    	dpi: c.dpi,
    	language: c.language,
    	thumb: c.mediumThumbnailUrl,
    	download: c.downloadLink,
  	}));

	return NextResponse.json({ cards });
  } catch (err) {
	console.error("[MPCFILL PROXY ERROR]", err);
	return NextResponse.json(
  	{ error: "MPCFill no respondió. Intenta de nuevo en unos segundos." },
  	{ status: 502 }
	);
  }
}

/**
 * Los diseños de un archivo de pedido de MPCFill, por su id.
 *
 * El XML que baja el cliente de mpcfill.com trae solo el id de cada diseño;
 * la miniatura y el nombre hay que pedírselos a MPCFill. Va por POST porque un
 * mazo son cien ids y no caben en una dirección.
 */
const MAX_IDS = 700;

export async function POST(req: Request) {
  let ids: unknown;
  try {
    ids = (await req.json())?.ids;
  } catch {
    return NextResponse.json({ error: "Pedido mal formado" }, { status: 400 });
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Faltan los diseños" }, { status: 400 });
  }
  // Son ids de Google Drive. Lo que no tenga esa forma no se manda a nadie.
  const limpios = [
    ...new Set(
      ids.filter((i): i is string => typeof i === "string" && /^[\w-]{10,80}$/.test(i))
    ),
  ].slice(0, MAX_IDS);
  if (limpios.length === 0) {
    return NextResponse.json({ cards: [] });
  }

  try {
    const cards: MpcCard[] = [];
    for (let i = 0; i < limpios.length; i += 200) {
      const res = await fetch(`${MPC_BASE}/cards/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIdentifiers: limpios.slice(i, i + 200) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`MPCFill cards ${res.status}`);
      const json = await res.json();
      for (const c of Object.values(
        (json.results ?? {}) as Record<
          string,
          {
            identifier: string;
            name: string;
            dpi: number;
            language: string;
            mediumThumbnailUrl: string;
            downloadLink: string;
          }
        >
      )) {
        cards.push({
          id: c.identifier,
          name: c.name,
          dpi: c.dpi,
          language: c.language,
          thumb: c.mediumThumbnailUrl,
          download: c.downloadLink,
        });
      }
    }
    return NextResponse.json({ cards });
  } catch (err) {
    console.error("[MPCFILL PROXY ERROR]", err);
    return NextResponse.json(
      { error: "MPCFill no respondió. Intenta de nuevo en unos segundos." },
      { status: 502 }
    );
  }
}
