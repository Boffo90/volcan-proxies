import { FINISHES, MIN_CARDS, type Finish } from "./pricing";

export const MATERIALES = [
  "papel200",
  "papel300",
  "pouchMatte",
  "pouchGlossy",
  "filmFrio",
  "tinta",
] as const;

export type MaterialKey = (typeof MATERIALES)[number];

export type MaterialInfo = {
  label: string;
  unidad: string;
  ayuda: string;
};

export const MATERIAL_INFO: Record<MaterialKey, MaterialInfo> = {
  papel200: {
	label: "Papel fotográfico 200g",
	unidad: "hojas",
	ayuda: "Para Glossy, Matte y Matte Premium.",
  },
  papel300: {
	label: "Papel 300g doble faz",
	unidad: "hojas",
	ayuda: "Solo para la Básica 300g.",
  },
  pouchMatte: {
	label: "Pouch termolaminar matte",
	unidad: "láminas",
	ayuda: "Matte usa una por hoja; Premium, una cada dos hojas.",
  },
  pouchGlossy: {
	label: "Pouch termolaminar glossy",
	unidad: "láminas",
	ayuda: "Una por hoja de Glossy.",
  },
  filmFrio: {
	label: "Laminado en frío matte",
	unidad: "hojas",
	ayuda: "Solo para Matte Premium, una por hoja.",
  },
  tinta: {
	label: "Tinta",
	unidad: "hojas que rinde",
	ayuda: "Cuántas hojas de proxies te quedan con la tinta cargada.",
  },
};

export type NivelStock = { cantidad: number; minimo: number };
export type Stock = Record<MaterialKey, NivelStock>;

export const STOCK_DEFAULT: Stock = {
  papel200: { cantidad: 0, minimo: 50 },
  papel300: { cantidad: 0, minimo: 50 },
  pouchMatte: { cantidad: 0, minimo: 100 },
  pouchGlossy: { cantidad: 0, minimo: 100 },
  filmFrio: { cantidad: 0, minimo: 50 },
  tinta: { cantidad: 0, minimo: 100 },
};

export function normalizeStock(raw: unknown): Stock {
  const out = {} as Stock;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
	string,
	unknown
  >;
  for (const m of MATERIALES) {
	const v = (r[m] && typeof r[m] === "object" ? r[m] : {}) as Record<
  	string,
  	unknown
	>;
	const num = (x: unknown, def: number) =>
  	typeof x === "number" && isFinite(x) ? x : def;
	out[m] = {
  	cantidad: num(v.cantidad, STOCK_DEFAULT[m].cantidad),
  	minimo: num(v.minimo, STOCK_DEFAULT[m].minimo),
	};
  }
  return out;
}

/**
* Lo que consume UNA hoja A4 (9 cartas) de cada acabado.
*
* El pouch del Premium va en 0,5 porque se meten dos hojas por lámina; para
* contar láminas enteras de un pedido está `consumoDeItems`, que redondea.
*/
export const RECETA: Record<Finish, Partial<Record<MaterialKey, number>>> = {
  base300: { papel300: 1, tinta: 1 },
  glossy: { papel200: 1, pouchGlossy: 1, tinta: 1 },
  matte: { papel200: 1, pouchMatte: 1, tinta: 1 },
  premium: { papel200: 1, pouchMatte: 0.5, filmFrio: 1, tinta: 1 },
};

export type ItemConsumo = { finish: string; quantity: number };

const vacio = (): Record<MaterialKey, number> =>
  Object.fromEntries(MATERIALES.map((m) => [m, 0])) as Record<
	MaterialKey,
	number
  >;

/**
* Materiales que consume un pedido.
*
* Las hojas se redondean hacia arriba por acabado: no se puede imprimir dos
* tercios de hoja, así que 60 cartas ocupan 7 hojas y no 6,67. Es una
* estimación conservadora a propósito — para planificar compras conviene que
* sobre y no que falte.
*/
export function consumoDeItems(
  items: ItemConsumo[]
): Record<MaterialKey, number> {
  const total = vacio();

  for (const f of FINISHES) {
	const cartas = items
  	.filter((i) => i.finish === f)
  	.reduce((s, i) => s + (i.quantity || 0), 0);
	if (cartas <= 0) continue;

	const hojas = Math.ceil(cartas / MIN_CARDS);

	for (const [mat, porHoja] of Object.entries(RECETA[f]) as Array<
  	[MaterialKey, number]
	>) {
  	// El pouch compartido se cuenta en láminas enteras por pedido.
  	total[mat] += porHoja < 1 ? Math.ceil(hojas * porHoja) : hojas * porHoja;
	}
  }

  return total;
}

/** Suma el consumo de varios pedidos. */
export function consumoDePedidos(
  pedidos: Array<{ items: ItemConsumo[] }>
): Record<MaterialKey, number> {
  const total = vacio();
  for (const p of pedidos) {
	const c = consumoDeItems(p.items || []);
	for (const m of MATERIALES) total[m] += c[m];
  }
  return total;
}

/** Estados cuya producción todavía no ha salido: consumen material futuro. */
export const ESTADOS_PENDIENTES = [
  "recibido",
  "pagado",
  "imprimiendo",
  "laminando",
];
