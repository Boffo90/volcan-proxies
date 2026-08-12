import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buscarPedidosAgrupables } from "@/lib/envio";

/**
* Dice si un pedido nuevo se puede sumar al envío de otro que el cliente ya
* tiene sin despachar. Lo usa el checkout para mostrar el envío en $0 antes de
* pagar; el cobro real lo decide igual el servidor al crear el pedido.
*
* Exige email y dirección completos y solo responde cuando ambos calzan
* exactamente, así no sirve para averiguar si un correo cualquiera tiene
* pedidos: hay que saber de antemano su dirección exacta.
*/
export async function POST(req: Request) {
  try {
	const { email, direccion, comuna, region } = (await req.json()) as {
  	email?: string;
  	direccion?: string;
  	comuna?: string;
  	region?: string;
	};

	if (!email?.trim() || !direccion?.trim() || !comuna?.trim()) {
  	return NextResponse.json({ agrupable: false, pedidos: [] });
	}

	const sb = supabaseAdmin();
	const encontrados = await buscarPedidosAgrupables(sb, {
  	email,
  	direccion,
  	comuna,
  	region,
	});

	return NextResponse.json({
  	agrupable: encontrados.length > 0,
  	pedidos: encontrados.map((p) => p.numero),
	});
  } catch {
	// Ante cualquier problema se responde que no aplica: el checkout muestra
	// el envío normal y el servidor corrige el cobro si corresponde.
	return NextResponse.json({ agrupable: false, pedidos: [] });
  }
}
