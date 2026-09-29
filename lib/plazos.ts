/**
 * El plazo que le prometemos al cliente, en un solo lugar.
 *
 * Estuvo escrito a mano en seis partes —portada, checkout, FAQ, nosotros y el
 * correo de confirmación— diciendo siempre "48 hrs". Cuando la cola creció, el
 * sitio siguió prometiendo lo mismo, y las dos promesas que más pesan son
 * justo las que no se ven navegando: la del checkout, que se lee **antes de
 * pagar**, y la del correo, que **le queda por escrito** al cliente.
 *
 * Acá vive el plazo real, se edita desde `/admin/plazos` y las seis partes lo
 * leen. Como los precios: la fuente de verdad está en la base, no en el código.
 */

import { FINISHES, type Finish } from "./pricing";

export const ESTADOS = ["normal", "alta", "pausado"] as const;
export type EstadoPlazo = (typeof ESTADOS)[number];

export type Plazos = {
  estado: EstadoPlazo;
  /** En palabras del cliente: "48 horas", "2 semanas". */
  plazo: string;
  /** Línea extra del aviso. Vacía, no se muestra. */
  aviso: string;
  /** Cuándo se vuelven a tomar pedidos. Solo aplica si está pausado. */
  reapertura: string;
  /**
   * Horas de taller al día. **Este número lo pone Seba**, no se estima: es el
   * único dato del cálculo de cola que no sale ni de la base ni del modelo de
   * costos. En cero, el panel no estima y lo dice.
   */
  horasPorDia: number;
};

export const PLAZOS_DEFAULT: Plazos = {
  estado: "normal",
  plazo: "48 horas",
  aviso: "",
  reapertura: "",
  horasPorDia: 0,
};

/**
 * Cuánto trabajo cuesta una carta de cada acabado, en horas.
 *
 * Sale de los tiempos reales de Seba para un pedido de 100 cartas
 * (CONTEXTO.md §8): Básica media hora, Reforzada una, Premium una y media.
 */
const HORAS_POR_CARTA: Record<Finish, number> = {
  base300: 0.5 / 100,
  reforzada300: 1.0 / 100,
  premiumFrio: 1.5 / 100,
  // Los tres retirados nunca se midieron y hoy no se venden, así que no hay
  // tiempo real que poner. Se les da el de la Reforzada, que es el del medio:
  // con la cola llena de acabados vivos, un pedido histórico suelto no mueve
  // la estimación, y dejarlos en cero la haría mentir hacia abajo.
  glossy: 1.0 / 100,
  matte: 1.0 / 100,
  premium: 1.5 / 100,
};

export type ItemCola = { finish: string; quantity?: number };

/** Las horas de taller que representa un conjunto de líneas de pedido. */
export function horasDeItems(items: ItemCola[]): number {
  let horas = 0;
  for (const f of FINISHES) {
	const cartas = items
  	.filter((i) => i.finish === f)
  	.reduce((s, i) => s + (i.quantity || 0), 0);
	horas += cartas * HORAS_POR_CARTA[f];
  }
  return horas;
}

/**
 * Cómo se redacta la promesa.
 *
 * El matiz es el resguardo: en marcha normal decimos "máximo", que es un
 * compromiso; con la cola cargada decimos "aproximadamente", que es una
 * estimación. Cambiar el número sin cambiar esa palabra dejaría un "máximo
 * 2 semanas" comprometiendo más de lo que se puede cumplir.
 */
export function promesa(p: Plazos): string {
  return p.estado === "normal"
	? `en máximo ${p.plazo}`
	: `en aproximadamente ${p.plazo}`;
}

/** Para títulos cortos, donde no cabe una frase. */
export function plazoCorto(p: Plazos): string {
  return p.plazo;
}

/** Si se pueden tomar pedidos nuevos. */
export function aceptaPedidos(p: Plazos): boolean {
  return p.estado !== "pausado";
}

function texto(v: unknown, respaldo: string, max = 120): string {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : respaldo;
}

export function normalizePlazos(raw: unknown): Plazos {
  const d = PLAZOS_DEFAULT;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;

  const estado = ESTADOS.includes(r.estado as EstadoPlazo)
	? (r.estado as EstadoPlazo)
	: d.estado;

  const horas = typeof r.horasPorDia === "number" && isFinite(r.horasPorDia)
	? Math.max(0, Math.min(24, r.horasPorDia))
	: d.horasPorDia;

  return {
	estado,
	plazo: texto(r.plazo, d.plazo, 40),
	aviso: texto(r.aviso, d.aviso, 240),
	reapertura: texto(r.reapertura, d.reapertura, 60),
	horasPorDia: horas,
  };
}

// --- Lectura desde el navegador, con la misma caché corta que los precios ---

let cache: Plazos | null = null;
let cacheAt = 0;
const TTL = 60_000;

export async function getPlazos(): Promise<Plazos> {
  const now = Date.now();
  if (cache && now - cacheAt < TTL) return cache;
  try {
	const res = await fetch("/api/plazos", { cache: "no-store" });
	if (!res.ok) throw new Error("fetch fail");
	const merged = normalizePlazos(await res.json());
	cache = merged;
	cacheAt = now;
	return merged;
  } catch {
	return PLAZOS_DEFAULT;
  }
}

export function clearPlazosCache() {
  cache = null;
  cacheAt = 0;
}
