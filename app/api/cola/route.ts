import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { esColumnaFaltante } from "@/lib/db";

/**
* Cuántos pedidos hay en produccion ahora mismo, para decírselo al cliente
* antes de que compre.
*
* Solo cuenta los pagados: un pedido sin pagar puede no pagarse nunca, y
* contarlo haría que la fila se vea más larga de lo que realmente es.
*/
const EN_PRODUCCION = ["pagado", "imprimiendo", "laminando"];

export const revalidate = 120;

export async function GET() {
  try {
	const sb = supabaseAdmin();
	const consulta = () =>
  	sb
    	.from("pedidos")
    	.select("id", { count: "exact", head: true })
    	.in("estado", EN_PRODUCCION);

	// Los archivados no se van a producir.
	let { count, error } = await consulta().is("archivado_at", null);
	if (error && esColumnaFaltante(error)) {
  	({ count, error } = await consulta());
	}
	if (error) throw error;

	return NextResponse.json({ pedidos: count ?? 0 });
  } catch {
	// Ante un fallo se responde null: el checkout no muestra nada en vez de
	// inventar un número.
	return NextResponse.json({ pedidos: null });
  }
}
