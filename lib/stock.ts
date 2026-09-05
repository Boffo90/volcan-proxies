import { CARTAS_POR_HOJA, FINISHES, type Finish } from "./pricing";

export const MATERIALES = [
  "papel200",
  "papel260",
  "papel300",
  "papelAdhesivo",
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
  papel260: {
	label: "Papel semibrillante 260g",
	unidad: "hojas",
	ayuda: "El frente de la Reforzada y del Premium.",
  },
  papel300: {
	label: "Papel 300g doble faz",
	unidad: "hojas",
	ayuda: "Solo para la Básica.",
  },
  papelAdhesivo: {
	label: "Papel adhesivo mate 130g",
	unidad: "hojas",
	ayuda: "El refuerzo de la Reforzada y del Premium: va pegado por detrás en las dos. Es el mismo papel, den 130 o 135 gramos.",
  },
  pouchMatte: {
	label: "Pouch termolaminar matte",
	unidad: "láminas",
	ayuda: "Una por hoja de Matte. El Matte Premium descontinuado usaba una cada dos.",
  },
  pouchGlossy: {
	label: "Pouch termolaminar glossy",
	unidad: "láminas",
	ayuda: "Una por hoja de Glossy.",
  },
  filmFrio: {
	label: "Laminado en frío matte",
	unidad: "hojas",
	ayuda: "Una por hoja del Premium. El Matte Premium descontinuado también lo usaba.",
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
  papel260: { cantidad: 0, minimo: 50 },
  papel300: { cantidad: 0, minimo: 50 },
  papelAdhesivo: { cantidad: 0, minimo: 50 },
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
* Lo que consume UNA hoja A4 (8 cartas, 4×2) de cada acabado.
*
* El pouch del Matte Premium descontinuado va en 0,5 porque se metían dos
* hojas por lámina; para
* contar láminas enteras de un pedido está `consumoDeItems`, que redondea.
*/
export const RECETA: Record<Finish, Partial<Record<MaterialKey, number>>> = {
  base300: { papel300: 1, tinta: 1 },
  // La clave dice "300" por historia; el acabado hoy es 260g más una hoja de
  // refuerzo por detrás, y ya no lleva pouch. La receta anterior contaba
  // papel de 300g y láminas de pouch que no se usan.
  reforzada300: { papel260: 1, papelAdhesivo: 1, tinta: 1 },
  premiumFrio: { papel200: 1, papelAdhesivo: 1, filmFrio: 1, tinta: 1 },
  glossy: { papel200: 1, pouchGlossy: 1, tinta: 1 },
  matte: { papel200: 1, pouchMatte: 1, tinta: 1 },
  premium: { papel200: 1, pouchMatte: 0.5, filmFrio: 1, tinta: 1 },
};

export type ItemConsumo = {
  finish: string;
  quantity: number;
  /** Con dorso personalizado la hoja pasa dos veces por la impresora. */
  dorsoUrl?: string;
};

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

	const hojas = Math.ceil(cartas / CARTAS_POR_HOJA);

	for (const [mat, porHoja] of Object.entries(RECETA[f]) as Array<
  	[MaterialKey, number]
	>) {
  	// El pouch compartido se cuenta en láminas enteras por pedido.
  	total[mat] += porHoja < 1 ? Math.ceil(hojas * porHoja) : hojas * porHoja;
	}

	// El dorso personalizado no gasta papel (el 300g ya es doble faz), pero sí
	// una segunda pasada de tinta sobre las hojas que lo llevan.
	const conDorso = items
  	.filter((i) => i.finish === f && i.dorsoUrl)
  	.reduce((s, i) => s + (i.quantity || 0), 0);
	if (conDorso > 0) total.tinta += Math.ceil(conDorso / CARTAS_POR_HOJA);
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
