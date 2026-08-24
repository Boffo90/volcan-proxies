/**
* Recetas de producción: con qué papel y a qué calidad se imprime cada tipo de
* carta. Es la referencia que se consulta al producir, no un dato de venta.
*
* Vive en la tabla config (sin migración) y se edita desde el panel: los
* procesos cambian seguido y no debería hacer falta un despliegue para
* corregir una receta.
*/
export type Formula = {
  id: string;
  /** Juegos que comparten esta receta. */
  juegos: string;
  /** Tamaño de carta, con medidas para no confundirse al armar la hoja. */
  tamano: string;
  /** "Premium", "Básica", o lo que se defina más adelante. */
  variante: string;
  /** Papel o papeles que la componen. */
  papeles: string;
  /** Calidad de impresión configurada en el driver. */
  calidad: string;
  /** Cualquier cosa que convenga recordar al producirla. */
  notas: string;
};

export const TAMANO_INGLES = "Inglés · 63 × 88 mm";
export const TAMANO_JAPONES = "Japonés · 59 × 86 mm";

export const FORMULAS_DEFAULT: Formula[] = [
  {
	id: "mtg-premium",
	juegos: "MTG, Pokémon",
	tamano: TAMANO_INGLES,
	variante: "Premium",
	papeles: "Semi-Glossy 260gr + Semi-Glossy 135gr",
	calidad: "La más alta",
	notas: "",
  },
  {
	id: "mtg-basica",
	juegos: "MTG, Pokémon",
	tamano: TAMANO_INGLES,
	variante: "Básica",
	papeles: "Semi-Glossy 300gr",
	calidad: "Estándar",
	notas: "",
  },
  {
	id: "jp-premium",
	juegos: "Yu-Gi-Oh!, Mitos y Leyendas, Cardfight! Vanguard",
	tamano: TAMANO_JAPONES,
	variante: "Premium",
	papeles: "Semi-Glossy 260gr + Semi-Glossy 135gr",
	calidad: "La más alta",
	notas: "",
  },
  {
	id: "jp-basica",
	juegos: "Yu-Gi-Oh!, Mitos y Leyendas, Cardfight! Vanguard",
	tamano: TAMANO_JAPONES,
	variante: "Básica",
	papeles: "Semi-Glossy 300gr",
	calidad: "Estándar",
	notas: "",
  },
  {
	id: "riftbound-premium",
	juegos: "Riftbound",
	tamano: TAMANO_INGLES,
	variante: "Premium",
	papeles: "Semi-Glossy 300gr + Semi-Glossy 135gr",
	calidad: "La más alta",
	notas: "Ojo: acá el papel base es 300gr, no 260gr como en las otras Premium.",
  },
  {
	id: "riftbound-basica",
	juegos: "Riftbound",
	tamano: TAMANO_INGLES,
	variante: "Básica",
	papeles: "Semi-Glossy 300gr",
	calidad: "Estándar",
	notas: "",
  },
];

const texto = (v: unknown, max: number, def = "") =>
  typeof v === "string" ? v.slice(0, max) : def;

export function normalizeFormulas(raw: unknown): Formula[] {
  if (!Array.isArray(raw)) return FORMULAS_DEFAULT;
  const out = raw
	.filter((f) => f && typeof f === "object")
	.map((f, i) => {
  	const r = f as Record<string, unknown>;
  	return {
    	id: texto(r.id, 60) || `formula-${i}`,
    	juegos: texto(r.juegos, 120),
    	tamano: texto(r.tamano, 60),
    	variante: texto(r.variante, 40),
    	papeles: texto(r.papeles, 200),
    	calidad: texto(r.calidad, 60),
    	notas: texto(r.notas, 400),
  	};
	});
  return out.length > 0 ? out : FORMULAS_DEFAULT;
}
