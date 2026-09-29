/**
 * El plazo publicado, y lo que la cola real dice que debería ser.
 *
 * El cálculo se hace acá y no en el navegador por lo mismo que en stock: para
 * no mandarle todos los pedidos al cliente. Y se hace, en vez de dejar que el
 * plazo se ponga a ojo, porque los datos ya existían repartidos —los pedidos
 * pendientes en la base, los tiempos por acabado en el modelo de costos— y
 * nadie los había juntado.
 */

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { esColumnaFaltante } from "@/lib/db";
import { ESTADOS_PENDIENTES } from "@/lib/stock";
import { horasDeItems, normalizePlazos, type ItemCola } from "@/lib/plazos";

type PedidoCola = { items: ItemCola[] };

async function leerCola(): Promise<PedidoCola[]> {
  const sb = supabaseAdmin();
  const consulta = () =>
	sb.from("pedidos").select("items, estado").in("estado", ESTADOS_PENDIENTES);

  // Un pedido archivado no se va a producir, así que no ocupa lugar en la cola.
  const conFiltro = await consulta().is("archivado_at", null);
  if (!conFiltro.error) return (conFiltro.data || []) as PedidoCola[];
  if (esColumnaFaltante(conFiltro.error)) {
	return ((await consulta()).data || []) as PedidoCola[];
  }
  return [];
}

export async function GET() {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data: fila } = await sb
	.from("config")
	.select("value")
	.eq("key", "plazos")
	.single();

  const plazos = normalizePlazos(fila?.value);
  const pedidos = await leerCola();

  const cartas = pedidos.reduce(
	(s, p) => s + (p.items || []).reduce((t, i) => t + (i.quantity || 0), 0),
	0
  );
  const horas = pedidos.reduce((s, p) => s + horasDeItems(p.items || []), 0);

  // Sin horas por día configuradas no se estima nada: ese número lo pone Seba
  // y el panel lo pide. Inventarlo sería devolver un plazo con cara de dato.
  const diasHabiles =
	plazos.horasPorDia > 0 ? Math.ceil(horas / plazos.horasPorDia) : null;

  return NextResponse.json({
	plazos,
	cola: { pedidos: pedidos.length, cartas, horas, diasHabiles },
  });
}

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plazos = normalizePlazos(await req.json());
  const sb = supabaseAdmin();

  // upsert y no update: la fila de plazos no existe hasta la primera vez que
  // se guarda, a diferencia de la de precios.
  const { error } = await sb
	.from("config")
	.upsert(
  	{ key: "plazos", value: plazos, updated_at: new Date().toISOString() },
  	{ onConflict: "key" }
	);

  if (error) {
	console.error("[PLAZOS PATCH] error:", error);
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plazos });
}
