// lib/pricing.ts
export type Finish = "glossy" | "matte";

export const PRICES = {
  glossy: 150,
  matte: 200,
  mazo60_glossy: 7900,
  mazo60_matte: 10900,
  commander100_glossy: 12900,
  commander100_matte: 17900,
  custom_surcharge: 50, // extra por carta custom
};

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateTotal(
  items: Array<{ finish: Finish; quantity: number }>
): { total: number; applied: string } {
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  // Si todo es Glossy o todo es Matte y cae en una promo
  const finishes = new Set(items.map((i) => i.finish));
  if (finishes.size === 1) {
    const f = [...finishes][0];
    if (totalQty === 60)
      return {
        total: f === "glossy" ? PRICES.mazo60_glossy : PRICES.mazo60_matte,
        applied: `Promo Mazo 60 ${f}`,
      };
    if (totalQty === 100)
      return {
        total:
          f === "glossy"
            ? PRICES.commander100_glossy
            : PRICES.commander100_matte,
        applied: `Promo Commander 100 ${f}`,
      };
  }

  // Cálculo unitario
  const total = items.reduce(
    (s, i) =>
      s +
      (i.finish === "glossy" ? PRICES.glossy : PRICES.matte) * i.quantity,
    0
  );
  return { total, applied: "Precio unitario" };
}