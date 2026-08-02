import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/flow";
import { supabaseAdmin } from "@/lib/supabase";
import {
  enviarEmailConfirmacion,
  reclamarConfirmacion,
} from "@/lib/emailPedido";

export async function POST(req: Request) {
  try {
	const bodyText = await req.text();
	const params = new URLSearchParams(bodyText);
	const token = params.get("token");

	if (!token) {
  	return NextResponse.json({ error: "Token requerido" }, { status: 400 });
	}

	const status = await getFlowPaymentStatus(token);

	const sb = supabaseAdmin();

	const updates: Record<string, unknown> = {
  	flow_order: String(status.flowOrder),
  	flow_token: token,
	};

	if (status.status === 2) {
  	updates.estado = "pagado";
  	updates.metodo_pago = "flow";
	}

	await sb.from("pedidos").update(updates).eq("id", status.commerceOrder);

	// Pago aprobado: avisarle al cliente que su pedido quedó confirmado. El
	// envío se reclama primero, así los reintentos del webhook de Flow no
	// mandan el mismo correo varias veces.
	if (status.status === 2) {
  	try {
    	const { data: pedido } = await sb
      	.from("pedidos")
      	.select(
        	"numero, cliente_nombre, cliente_email, total, delivery_type, direccion, comuna, region"
      	)
      	.eq("id", status.commerceOrder)
      	.single();

    	if (pedido && (await reclamarConfirmacion(sb, status.commerceOrder))) {
      	await enviarEmailConfirmacion(pedido);
    	}
  	} catch (e) {
    	// El pago ya está registrado: si falla el correo no rompemos el webhook,
    	// porque Flow reintentaría un cobro que en realidad sí se guardó.
    	console.error("[FLOW CONFIRM EMAIL] error:", e);
  	}
	}

	return NextResponse.json({ ok: true });
  } catch (err) {
	console.error("[FLOW CONFIRM ERROR]", err);
	return NextResponse.json({ error: "Error confirmando pago" }, { status: 500 });
  }
}

