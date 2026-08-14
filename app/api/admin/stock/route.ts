import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  ESTADOS_PENDIENTES,
  consumoDePedidos,
  normalizeStock,
  type ItemConsumo,
} from "@/lib/stock";
import { esColumnaFaltante } from "@/lib/db";

/**
* Devuelve el stock guardado y, además, lo que van a consumir los pedidos que
* todavía no salen. Ese cálculo se hace acá y no en el cliente para no tener
* que mandarle todos los pedidos al navegador.
*/
export async function GET() {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();

  const { data: fila } = await sb
	.from("config")
	.select("value")
	.eq("key", "stock")
	.single();

  const consulta = () =>
	sb.from("pedidos").select("items, estado").in("estado", ESTADOS_PENDIENTES);

  // Un pedido archivado no se va a producir, así que no reserva material.
  const conFiltro = await consulta().is("archivado_at", null);
  let pedidos = conFiltro.data;
  if (conFiltro.error && esColumnaFaltante(conFiltro.error)) {
	pedidos = (await consulta()).data;
  }

  const lista = (pedidos || []) as Array<{ items: ItemConsumo[] }>;

  return NextResponse.json({
	stock: normalizeStock(fila?.value),
	consumo: consumoDePedidos(lista),
	pedidosPendientes: lista.length,
  });
}

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const stock = normalizeStock(body);

  const sb = supabaseAdmin();
  // upsert y no update: la fila de stock puede no existir todavía, a
  // diferencia de la de precios.
  const { error } = await sb
	.from("config")
	.upsert(
  	{ key: "stock", value: stock, updated_at: new Date().toISOString() },
  	{ onConflict: "key" }
	);

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stock });
}
