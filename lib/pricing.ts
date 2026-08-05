export const FINISHES = ["base300", "glossy", "matte", "premium"] as const;
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
};

// Los pros y contras son los reales de cada proceso: decirlos hace creíble
// que el Premium valga el triple que la Básica.
export const FINISH_INFO: Record<Finish, FinishInfo> = {
  base300: {
	label: "Básica 300g",
	corto: "Básica",
	desc: "Papel de 300g doble faz, sin laminar.",
	pro: "La más económica, con buenos colores y detalle.",
	contra: "Más delgada que las laminadas.",
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
  premium: {
	label: "Matte Premium",
	corto: "Premium",
	desc: "Doble laminado: pouch mate por detrás y laminado en frío por delante.",
	pro: "El mejor detalle y color de los cuatro.",
	contra: "Se curvan levemente, como las foil originales.",
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
  custom_surcharge: number;
};

// Precios vigentes. Glossy y Matte son los que ya estaban en producción; la
// Básica y el Premium se fijaron sobre su costo real (materiales + flete a
// Pucón + mano de obra), apuntando al mismo ~65% de margen que el resto.
export const PRECIOS_DEFAULT: Precios = {
  unitario: { base300: 130, glossy: 200, matte: 250, premium: 400 },
  mazo60: { base300: 7900, glossy: 9900, matte: 12900, premium: 23900 },
  commander100: { base300: 12900, glossy: 15500, matte: 19900, premium: 39900 },
  disponible: { base300: true, glossy: true, matte: true, premium: true },
  custom_surcharge: 100,
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

type CartCalcItem = {
  finish: Finish;
  quantity: number;
  isCustom?: boolean;
};

export function calculateTotalWith(
  precios: Precios,
  items: CartCalcItem[]
): { total: number; applied: string } {
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const customQty = items
	.filter((i) => i.isCustom)
	.reduce((s, i) => s + i.quantity, 0);

  const finishes = new Set(items.map((i) => i.finish));
  const hasCustom = items.some((i) => i.isCustom);

  // Las promos son por mazo completo de un mismo acabado y sin customs.
  if (finishes.size === 1 && !hasCustom) {
	const f = [...finishes][0];
	if (totalQty === 60)
  	return {
    	total: precios.mazo60[f],
    	applied: `Promo Mazo 60 ${FINISH_INFO[f].label}`,
  	};
	if (totalQty === 100)
  	return {
    	total: precios.commander100[f],
    	applied: `Promo Commander 100 ${FINISH_INFO[f].label}`,
  	};
  }

  const base = items.reduce(
	(s, i) => s + precioUnitario(precios, i.finish) * i.quantity,
	0
  );
  const surcharge = customQty * precios.custom_surcharge;
  const total = base + surcharge;

  const applied =
	customQty > 0
  	? `Precio unitario + ${customQty} carta(s) custom`
  	: "Precio unitario";

  return { total, applied };
}

export function calculateTotal(items: CartCalcItem[]): {
  total: number;
  applied: string;
} {
  return calculateTotalWith(cachedPrecios || PRECIOS_DEFAULT, items);
}
