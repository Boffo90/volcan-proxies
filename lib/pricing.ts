export type Finish = "glossy" | "matte";

export type Precios = {
  glossy: number;
  matte: number;
  mazo60_glossy: number;
  mazo60_matte: number;
  commander100_glossy: number;
  commander100_matte: number;
  custom_surcharge: number;
};

// Fallback por si la API falla
export const PRECIOS_DEFAULT: Precios = {
  glossy: 150,
  matte: 200,
  mazo60_glossy: 7900,
  mazo60_matte: 10900,
  commander100_glossy: 12900,
  commander100_matte: 17900,
  custom_surcharge: 50,
};

// Compatibilidad con código que aún usa PRICES (no rompe nada)
export const PRICES = PRECIOS_DEFAULT;

let cachedPrecios: Precios | null = null;
let cachedAt = 0;
const TTL = 60_000; // 1 minuto

export async function getPrecios(): Promise<Precios> {
  const now = Date.now();
  if (cachedPrecios && now - cachedAt < TTL) {
	return cachedPrecios;
  }
  try {
	const res = await fetch("/api/precios", { cache: "no-store" });
	if (!res.ok) throw new Error("fetch fail");
	const data = await res.json();
	cachedPrecios = { ...PRECIOS_DEFAULT, ...data };
	cachedAt = now;
	return cachedPrecios;
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

export function calculateTotalWith(
  precios: Precios,
  items: Array<{ finish: Finish; quantity: number }>
): { total: number; applied: string } {
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const finishes = new Set(items.map((i) => i.finish));

  if (finishes.size === 1) {
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

  const total = items.reduce(
	(s, i) =>
  	s +
  	(i.finish === "glossy" ? precios.glossy : precios.matte) * i.quantity,
	0
  );
  return { total, applied: "Precio unitario" };
}

// Wrapper para compatibilidad con código antiguo que usaba calculateTotal sin precios
export function calculateTotal(
  items: Array<{ finish: Finish; quantity: number }>
): { total: number; applied: string } {
  return calculateTotalWith(cachedPrecios || PRECIOS_DEFAULT, items);
}

