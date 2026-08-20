import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createFlowPayment } from "@/lib/flow";

/**
* Genera un link de pago nuevo para un pedido que quedó sin pagar.
*
* Cuando un pago falla en Flow, el link anterior ya no sirve y el cliente se
* queda sin forma de reintentar: tendría que rearmar el carrito entero. Por eso
* la mayoría abandona el pedido. Esto le devuelve el camino.
*
* Va por número de pedido, igual que la página de seguimiento, que ya es
* pública. Lo peor que puede hacer un tercero con esto es pagar un pedido
* ajeno.
*/
export async function POST(req: Request) {
  try {
	const { numero } = (await req.json()) as { numero?: number | string };
	const num = parseInt(String(numero ?? ""), 10);
	if (isNaN(num)) {
  	return NextResponse.json({ error: "Número inválido" }, { status: 400 });
	}

	const sb = supabaseAdmin();
	const { data: pedido, error } = await sb
  	.from("pedidos")
  	.select("id, numero, estado, total, cliente_email, archivado_at")
  	.eq("numero", num)
  	.single();

	if (error || !pedido) {
  	return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
	}

	// Un pedido ya pagado no se vuelve a cobrar.
	if (pedido.estado !== "recibido") {
  	return NextResponse.json(
    	{ error: "Este pedido ya está pagado.", yaPagado: true },
    	{ status: 409 }
  	);
	}

	if (pedido.archivado_at) {
  	return NextResponse.json(
    	{ error: "Este pedido fue cancelado. Escríbenos si quieres retomarlo." },
    	{ status: 409 }
  	);
	}

	const siteUrl = (
  	process.env.NEXT_PUBLIC_SITE_URL || "https://www.volcanproxies.cl"
	).replace("://volcanproxies.cl", "://www.volcanproxies.cl");

	const pago = await createFlowPayment({
  	commerceOrder: String(pedido.id),
  	subject: `Volcán Proxies - Pedido #${pedido.numero}`,
  	amount: pedido.total,
  	email: pedido.cliente_email,
  	urlConfirmation: siteUrl + "/api/flow/confirm",
  	urlReturn: siteUrl + "/gracias?pedido=" + pedido.numero + "&metodo=flow",
	});

	// El token nuevo reemplaza al anterior: es el que vale de aquí en adelante.
	await sb
  	.from("pedidos")
  	.update({
    	flow_token: pago.token,
    	flow_order: pago.flowOrder ? String(pago.flowOrder) : null,
    	metodo_pago: "flow",
  	})
  	.eq("id", pedido.id);

	return NextResponse.json({ payment_url: pago.url + "?token=" + pago.token });
  } catch (e) {
	console.error("[REINTENTO PAGO]", e);
	return NextResponse.json(
  	{ error: "No se pudo generar el link de pago. Intenta de nuevo." },
  	{ status: 500 }
	);
  }
}
