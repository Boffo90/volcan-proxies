export const FINISHES = [
  "base300",
  "reforzada300",
  "glossy",
  "matte",
  "premium",
] as const;
export type Finish = (typeof FINISHES)[number];

export type FinishInfo = {
  /** Nombre completo, para el detalle y el admin. */
  label: string;
  /** Nombre corto, para botones y chips. */
  corto: string;
  /** Cómo se fabrica, en una línea. */
  desc: string;
  pro: string;
  contra: string;
  /**
  * Retirado para siempre, no solo pausado. Sirve para no prometerle al
  * cliente que vuelve, y se conserva para que los pedidos antiguos sigan
  * mostrando el acabado con el que se hicieron.
  */
  descontinuado?: boolean;
};

// Los pros y contras son los reales de cada proceso: decirlos hace creíble
// que el Premium valga el triple que la Básica.
export const FINISH_INFO: Record<Finish, FinishInfo> = {
  base300: {
	label: "Básica 300g",
	corto: "Básica",
	desc: "Papel fotográfico de 300g semibrillante, sin laminar.",
	pro: "Acabado muy parecido al de una carta real, y la más económica.",
	contra: "Más delgada que una carta real y sin protección al uso.",
  },
  reforzada300: {
	label: "Premium 300g",
	corto: "Premium",
	desc: "Papel de 300g semibrillante con laminado mate por detrás.",
	pro: "La mejor calidad de imagen, con la firmeza y el snap de una carta real.",
	contra: "Se curva levemente, y el frente va sin laminar.",
  },
  glossy: {
	label: "Glossy",
	corto: "Glossy",
	desc: "Laminado en caliente brillante.",
	pro: "Colores brillantes y saturados.",
	contra: "Se marcan las huellas.",
  },
  matte: {
	label: "Matte",
	corto: "Matte",
	desc: "Laminado en caliente mate.",
	pro: "Snap y rigidez muy parecidos a una carta real.",
	contra: "Los negros se opacan un poco.",
  },
  // Descontinuado: el doble laminado daba prácticamente el mismo resultado que
  // el Premium 300g con el doble de trabajo. Se conserva para que los pedidos
  // antiguos sigan mostrando el acabado con el que se hicieron.
  premium: {
	label: "Matte Premium (descontinuado)",
	corto: "Descontinuado",
	desc: "Doble laminado: pouch mate por detrás y laminado en frío por delante.",
	pro: "Reemplazado por el Premium 300g, que da el mismo resultado.",
	contra: "Ya no se produce.",
	descontinuado: true,
  },
};

export type Precios = {
  /** Precio por carta suelta. */
  unitario: Record<Finish, number>;
  /** Promo de 60 cartas (mazo construido). */
  mazo60: Record<Finish, number>;
  /** Promo de 100 cartas (commander). */
  commander100: Record<Finish, number>;
  /** Acabados habilitados para la venta, controlado desde el admin. */
  disponible: Record<Finish, boolean>;
  /**
  * Recargo por carta custom. Se cobra UNA vez por diseño distinto, no por
  * copia: preparar el archivo es un solo trabajo aunque pidan veinte copias.
  */
  custom_surcharge: number;
  /** Cargo por preparar el archivo de un dorso personalizado, una vez por diseño. */
  dorso_diseno: number;
  /**
  * Extra por cada carta que lleva dorso personalizado. Cubre la segunda pasada
  * por la impresora, que es el cuello de botella real de producción.
  */
  dorso_carta: number;
};

// Precios vigentes. Glossy y Matte son los que ya estaban en producción; la
// Básica y el Premium se fijaron sobre su costo real (materiales + flete a
// Pucón + mano de obra), apuntando al mismo ~65% de margen que el resto.
export const PRECIOS_DEFAULT: Precios = {
  unitario: {
	base300: 130,
	reforzada300: 250,
	glossy: 200,
	matte: 250,
	premium: 400,
  },
  // Las promos descuentan ~15% a las 60 cartas y ~20% a las 100, el mismo
  // escalón que ya tenían Glossy y Matte. Básica y Premium nacieron sin
  // descuento real (llegaban a costar más que las cartas sueltas).
  mazo60: {
	base300: 6600,
	reforzada300: 12900,
	glossy: 9900,
	matte: 12900,
	premium: 20400,
  },
  commander100: {
	base300: 10400,
	reforzada300: 19900,
	glossy: 15500,
	matte: 19900,
	premium: 31900,
  },
  disponible: {
	base300: true,
	reforzada300: true,
	glossy: true,
	matte: true,
	premium: true,
  },
  custom_surcharge: 100,
  // El dorso custom casi no cuesta material (el 300g ya es doble faz y la
  // tinta de una hoja extra son ~$30): lo que cuesta es preparar el archivo,
  // una vez, y el tiempo de impresora, que sí escala con cada carta.
  dorso_diseno: 1500,
  dorso_carta: 40,
};

/**
* Acepta tanto el JSON nuevo (registros por acabado) como el viejo, que era
* plano y solo tenía glossy y matte:
*   { glossy, matte, mazo60_glossy, ..., glossy_disponible, matte_disponible }
* Sin esto, un config todavía sin migrar dejaría los precios en cero.
*/
export function normalizePrecios(raw: unknown): Precios {
  const d = PRECIOS_DEFAULT;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;

  const num = (v: unknown, fallback: number) =>
	typeof v === "number" && isFinite(v) ? v : fallback;
  const bool = (v: unknown, fallback: boolean) =>
	typeof v === "boolean" ? v : fallback;

  const grupo = (
	nuevo: unknown,
	viejo: Partial<Record<Finish, unknown>>,
	base: Record<Finish, number>
  ): Record<Finish, number> => {
	const n = (nuevo && typeof nuevo === "object" ? nuevo : {}) as Record<
  	string,
  	unknown
	>;
	const out = {} as Record<Finish, number>;
	for (const f of FINISHES) {
  	out[f] = num(n[f], num(viejo[f], base[f]));
	}
	return out;
  };

  return {
	unitario: grupo(r.unitario, { glossy: r.glossy, matte: r.matte }, d.unitario),
	mazo60: grupo(
  	r.mazo60,
  	{ glossy: r.mazo60_glossy, matte: r.mazo60_matte },
  	d.mazo60
	),
	commander100: grupo(
  	r.commander100,
  	{ glossy: r.commander100_glossy, matte: r.commander100_matte },
  	d.commander100
	),
	disponible: (() => {
  	const n = (r.disponible && typeof r.disponible === "object"
    	? r.disponible
    	: {}) as Record<string, unknown>;
  	const viejo: Partial<Record<Finish, unknown>> = {
    	glossy: r.glossy_disponible,
    	matte: r.matte_disponible,
  	};
  	const out = {} as Record<Finish, boolean>;
  	for (const f of FINISHES) {
    	out[f] = bool(n[f], bool(viejo[f], d.disponible[f]));
  	}
  	return out;
	})(),
	custom_surcharge: num(r.custom_surcharge, d.custom_surcharge),
	dorso_diseno: num(r.dorso_diseno, d.dorso_diseno),
	dorso_carta: num(r.dorso_carta, d.dorso_carta),
  };
}

export function precioUnitario(precios: Precios, finish: Finish): number {
  return precios.unitario[finish] ?? PRECIOS_DEFAULT.unitario[finish];
}

/** Acabado por defecto: el primero disponible, siguiendo el orden de FINISHES. */
export function defaultFinish(precios: Precios): Finish {
  return FINISHES.find((f) => precios.disponible[f]) ?? "matte";
}

export function finishDisponible(precios: Precios, finish: Finish): boolean {
  return !!precios.disponible[finish];
}

export function finishesDisponibles(precios: Precios): Finish[] {
  return FINISHES.filter((f) => precios.disponible[f]);
}

/** Convierte un valor guardado (pedidos viejos incluidos) en un Finish válido. */
export function parseFinish(v: unknown): Finish {
  return FINISHES.includes(v as Finish) ? (v as Finish) : "matte";
}

export const PRICES = PRECIOS_DEFAULT;

// Mínimo de cartas por pedido (1 hoja de papel = 9 cartas)
export const MIN_CARDS = 9;

// Costo único de envío (tarifa plana a todo Chile)
export const SHIPPING_COST = 4990;

let cachedPrecios: Precios | null = null;
let cachedAt = 0;
const TTL = 60_000;

export async function getPrecios(): Promise<Precios> {
  const now = Date.now();
  if (cachedPrecios && now - cachedAt < TTL) {
	return cachedPrecios;
  }
  try {
	const res = await fetch("/api/precios", { cache: "no-store" });
	if (!res.ok) throw new Error("fetch fail");
	const data = await res.json();
	const merged = normalizePrecios(data);
	cachedPrecios = merged;
	cachedAt = now;
	return merged;
  } catch {
	return PRECIOS_DEFAULT;
  }
}

export function clearPreciosCache() {
  cachedPrecios = null;
  cachedAt = 0;
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
	style: "currency",
	currency: "CLP",
	maximumFractionDigits: 0,
  }).format(amount);
}

export type CartCalcItem = {
  /**
  * Identifica el diseño. El recargo custom se cobra una vez por diseño, así
  * que dos líneas con el mismo id (la misma imagen en dos acabados) pagan un
  * solo recargo.
  */
  id?: string;
  finish: Finish;
  quantity: number;
  isCustom?: boolean;
  /** Imagen del dorso personalizado, si el cliente pidió uno para esta carta. */
  dorsoUrl?: string;
};

/** Desglose de los cobros que no son la carta en sí. */
export type Recargos = {
  /** Diseños custom distintos, que es lo que se cobra. */
  customDisenos: number;
  customTotal: number;
  /** Dorsos personalizados distintos. */
  dorsoDisenos: number;
  /** Cartas que llevan dorso personalizado. */
  dorsoCartas: number;
  dorsoTotal: number;
};

/**
* Cuenta diseños distintos. Sin `id` no hay forma de saber si dos líneas son
* el mismo diseño, así que se cuentan por separado: se prefiere cobrar de más
* antes que regalar trabajo por un dato que falta.
*/
function contarDisenos(items: CartCalcItem[]): number {
  const vistos = new Set<string>();
  items.forEach((i, idx) => vistos.add(i.id ?? `sin-id-${idx}`));
  return vistos.size;
}

/** Tope de la optimización: sobre esto se cobra unitario y no se arma la tabla. */
const MAX_OPTIMIZABLE = 5000;

type PromoAplicada = { etiqueta: string; veces: number };

/**
* Reparte `cantidad` cartas de un mismo acabado entre las promos disponibles y
* cartas sueltas, buscando el precio más barato para el cliente.
*
* Es un problema de cambio de monedas: para cada cantidad se guarda el mejor
* precio, usando una promo o una carta suelta. Así 260 cartas se resuelven solas
* como dos Commander 100 más un Mazo 60, y el resultado nunca puede salir más
* caro que pagarlas todas sueltas, porque esa opción siempre compite.
*/
function repartirEnPromos(
  cantidad: number,
  unitario: number,
  promos: Array<{ cantidad: number; precio: number; etiqueta: string }>
): { total: number; aplicadas: PromoAplicada[] } {
  if (cantidad <= 0) return { total: 0, aplicadas: [] };

  // Solo sirven las promos que realmente convienen frente al precio suelto.
  const utiles = promos.filter(
	(p) => p.cantidad > 0 && p.precio < p.cantidad * unitario
  );
  if (utiles.length === 0 || cantidad > MAX_OPTIMIZABLE) {
	return { total: cantidad * unitario, aplicadas: [] };
  }

  const costo = new Array<number>(cantidad + 1).fill(Infinity);
  const paso = new Array<{ etiqueta: string | null; size: number } | null>(
	cantidad + 1
  ).fill(null);
  costo[0] = 0;

  for (let i = 1; i <= cantidad; i++) {
	costo[i] = costo[i - 1] + unitario;
	paso[i] = { etiqueta: null, size: 1 };
	for (const p of utiles) {
  	if (i >= p.cantidad && costo[i - p.cantidad] + p.precio < costo[i]) {
    	costo[i] = costo[i - p.cantidad] + p.precio;
    	paso[i] = { etiqueta: p.etiqueta, size: p.cantidad };
  	}
	}
  }

  const conteo = new Map<string, number>();
  for (let i = cantidad; i > 0; ) {
	const u = paso[i]!;
	if (u.etiqueta) conteo.set(u.etiqueta, (conteo.get(u.etiqueta) ?? 0) + 1);
	i -= u.size;
  }

  return {
	total: costo[cantidad],
	aplicadas: [...conteo].map(([etiqueta, veces]) => ({ etiqueta, veces })),
  };
}

export function calculateTotalWith(
  precios: Precios,
  items: CartCalcItem[]
): { total: number; applied: string; recargos: Recargos } {
  let total = 0;
  const aplicadas: PromoAplicada[] = [];

  // Las promos son por acabado, así que un pedido que mezcla acabados igual
  // aprovecha la de cada grupo.
  //
  // Las customs suman para las promos como cualquier otra carta: el papel, la
  // tinta, el laminado y la hoja son exactamente los mismos, y la promo existe
  // porque el costo por carta baja con el volumen. Dejarlas fuera hacía que un
  // mazo custom costara más del doble que el mismo mazo normal. Lo único
  // propio de una custom es preparar el archivo, y eso se cobra aparte.
  for (const f of FINISHES) {
	const cantidad = items
  	.filter((i) => i.finish === f)
  	.reduce((s, i) => s + i.quantity, 0);
	if (cantidad <= 0) continue;

	const r = repartirEnPromos(cantidad, precioUnitario(precios, f), [
  	{
    	cantidad: 100,
    	precio: precios.commander100[f],
    	etiqueta: `Commander 100 ${FINISH_INFO[f].label}`,
  	},
  	{
    	cantidad: 60,
    	precio: precios.mazo60[f],
    	etiqueta: `Mazo 60 ${FINISH_INFO[f].label}`,
  	},
	]);

	total += r.total;
	aplicadas.push(...r.aplicadas);
  }

  // Recargo por DISEÑO custom distinto, no por copia: preparar el archivo es
  // un solo trabajo aunque el cliente pida veinte copias, y aunque las pida
  // repartidas en dos acabados.
  const customs = items.filter((i) => i.isCustom);
  const customDisenos = contarDisenos(customs);
  const customTotal = customDisenos * precios.custom_surcharge;
  total += customTotal;

  // Dorso personalizado: el archivo se prepara una vez por diseño de dorso, y
  // el extra por carta cubre la segunda pasada por la impresora. Las MDFC no
  // entran acá: su reverso ya viene con la carta y va sin costo.
  const conDorso = items.filter((i) => i.dorsoUrl);
  const dorsoCartas = conDorso.reduce((s, i) => s + i.quantity, 0);
  const dorsoDisenos = new Set(conDorso.map((i) => i.dorsoUrl!)).size;
  const dorsoTotal =
	dorsoDisenos * precios.dorso_diseno + dorsoCartas * precios.dorso_carta;
  total += dorsoTotal;

  const partes = aplicadas.map((a) =>
	a.veces > 1 ? `${a.veces}× Promo ${a.etiqueta}` : `Promo ${a.etiqueta}`
  );
  if (customDisenos > 0) {
	partes.push(
  	`${customDisenos} diseño${customDisenos !== 1 ? "s" : ""} custom`
	);
  }
  if (dorsoCartas > 0) {
	partes.push(
  	`dorso personalizado en ${dorsoCartas} carta${
    	dorsoCartas !== 1 ? "s" : ""
  	}`
	);
  }

  return {
	total,
	applied: partes.length > 0 ? partes.join(" + ") : "Precio unitario",
	recargos: {
  	customDisenos,
  	customTotal,
  	dorsoDisenos,
  	dorsoCartas,
  	dorsoTotal,
	},
  };
}

export type SugerenciaPromo = {
  finish: Finish;
  faltan: number;
  ahorro: number;
  /** Total al que quedaría el pedido si agrega esas cartas. */
  totalConPromo: number;
};

/** Hasta cuántas cartas más se mira para sugerir alcanzar una promo. */
const VENTANA_SUGERENCIA = 100;

/**
* Busca si agregar unas pocas cartas de un acabado dejaría el pedido MÁS BARATO
* que ahora, por alcanzar una promo.
*
* Es la contracara de los tramos por volumen: entre 152 y 159 cartas se paga
* más que por 160. En vez de regalar esas cartas, se le avisa al cliente para
* que decida — le sale mejor a él y es una venta más grande.
*/
export function sugerenciaPromo(
  precios: Precios,
  items: CartCalcItem[]
): SugerenciaPromo | null {
  let mejor: SugerenciaPromo | null = null;

  for (const f of FINISHES) {
	if (!precios.disponible[f]) continue;

	const cantidad = items
  	.filter((i) => i.finish === f)
  	.reduce((s, i) => s + i.quantity, 0);
	if (cantidad <= 0) continue;

	const unitario = precioUnitario(precios, f);
	const promos = [
  	{ cantidad: 100, precio: precios.commander100[f], etiqueta: "" },
  	{ cantidad: 60, precio: precios.mazo60[f], etiqueta: "" },
	];
	const actual = repartirEnPromos(cantidad, unitario, promos).total;

	for (let extra = 1; extra <= VENTANA_SUGERENCIA; extra++) {
  	const conExtra = repartirEnPromos(cantidad + extra, unitario, promos).total;
  	const ahorro = actual - conExtra;
  	if (ahorro > 0 && (!mejor || ahorro > mejor.ahorro)) {
    	mejor = { finish: f, faltan: extra, ahorro, totalConPromo: conExtra };
  	}
	}
  }

  return mejor;
}

export function calculateTotal(items: CartCalcItem[]): {
  total: number;
  applied: string;
  recargos: Recargos;
} {
  return calculateTotalWith(cachedPrecios || PRECIOS_DEFAULT, items);
}
