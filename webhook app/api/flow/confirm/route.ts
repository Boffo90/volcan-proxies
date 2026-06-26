import { NextResponse } from "next/server";
import { getFlowPaymentStatus } from "@/lib/flow";
import { supabaseAdmin } from "@/lib/supabase";

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

	return NextResponse.json({ ok: true });
  } catch (err) {
	console.error("[FLOW CONFIRM ERROR]", err);
	return NextResponse.json({ error: "Error confirmando pago" }, { status: 500 });
  }
}

