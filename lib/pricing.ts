export type Finish = "glossy" | "matte";

export type Precios = {
  glossy: number;
  matte: number;
  mazo60_glossy: number;
  mazo60_matte: number;
  commander100_glossy: number;
  commander100_matte: number;
  custom_surcharge: number;
  // Disponibilidad de acabados, controlada desde el admin. Viven en el mismo
  // JSON de la tabla config, así que no requieren migración.
  glossy_disponible: boolean;
  matte_disponible: boolean;
};

export const PRECIOS_DEFAULT: Precios = {
  glossy: 150,
  matte: 200,
  mazo60_glossy: 7900,
  mazo60_matte: 10900,
  commander100_glossy: 12900,
  commander100_matte: 17900,
  custom_surcharge: 50,
  glossy_disponible: true,
  matte_disponible: true,
};

/** Acabado por defecto según disponibilidad (glossy si está, si no matte). */
export function defaultFinish(precios: Precios): Finish {
  return precios.glossy_disponible || !precios.matte_disponible
	? "glossy"
	: "matte";
}

export function finishDisponible(precios: Precios, finish: Finish): boolean {
  return finish === "glossy"
	? precios.glossy_disponible
	: precios.matte_disponible;
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
	const merged: Precios = { ...PRECIOS_DEFAULT, ...data };
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

  if (finishes.size === 1 && !hasCustom) {
	const f = [...finishes][0];
	if (totalQty === 60)
  	return {
    	total: f === "glossy" ? precios.mazo60_glossy : precios.mazo60_matte,
    	applied: `Promo Mazo 60 ${f}`,
  	};
	if (totalQty === 100)
  	return {
    	total:
      	f === "glossy"
        	? precios.commander100_glossy
        	: precios.commander100_matte,
    	applied: `Promo Commander 100 ${f}`,
  	};
  }

  const base = items.reduce(
	(s, i) =>
  	s +
  	(i.finish === "glossy" ? precios.glossy : precios.matte) * i.quantity,
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

