import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getFlowPaymentStatus } from "@/lib/flow";

// Consulta a Flow el estado REAL del pago de un pedido. El panel lo usa para
// no depender solo del estado guardado: si el webhook de confirmación nunca
// llegó (o alguien avanzó el pedido a mano), aquí se ve la verdad.
//
// Códigos de Flow: 1 pendiente · 2 pagada · 3 rechazada · 4 anulada.
const ETIQUETAS: Record<number, string> = {
  1: "Pendiente de pago",
  2: "Pagada",
  3: "Rechazada",
  4: "Anulada",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = supabaseAdmin();

  const { data: pedido, error } = await sb
	.from("pedidos")
	.select("metodo_pago, flow_token, estado, total")
	.eq("id", id)
	.single();

  if (error || !pedido) {
	return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (pedido.metodo_pago !== "flow" || !pedido.flow_token) {
	return NextResponse.json({ aplica: false });
  }

  try {
	const status = await getFlowPaymentStatus(pedido.flow_token);

	return NextResponse.json({
  	aplica: true,
  	status: status.status,
  	etiqueta: ETIQUETAS[status.status] || `Desconocido (${status.status})`,
  	pagado: status.status === 2,
  	monto: status.amount,
  	pagador: status.payer ?? null,
  	flowOrder: status.flowOrder ?? null,
	});
  } catch (e) {
	// Un fallo de consulta NO es lo mismo que "no pagado": puede ser un
	// problema de credenciales o de red. Lo devolvemos como indeterminado
	// para no mostrarle al admin un "sin pagar" que no está comprobado.
	const mensaje = e instanceof Error ? e.message : "Error consultando Flow";
	console.error("[FLOW STATUS ADMIN]", mensaje);
	return NextResponse.json({ aplica: true, error: mensaje }, { status: 200 });
  }
}
