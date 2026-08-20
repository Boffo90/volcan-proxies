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
  	return NextResponse.json({ agrupable: false, pedidos: [], sinPagar: [] });
	}

	const sb = supabaseAdmin();
	const encontrados = await buscarPedidosAgrupables(sb, {
  	email,
  	direccion,
  	comuna,
  	region,
	});

	// El envío solo se libera contra un pedido ya pagado. Los pendientes se
	// informan aparte para poder avisarle al cliente, pero no dan despacho
	// gratis: si no, bastaría con dejar un pedido sin pagar para evitarlo.
	const pagados = encontrados.filter((p) => p.pagado);
	const sinPagar = encontrados.filter((p) => !p.pagado);

	return NextResponse.json({
  	agrupable: pagados.length > 0,
  	pedidos: pagados.map((p) => p.numero),
  	sinPagar: sinPagar.map((p) => p.numero),
	});
  } catch {
	// Ante cualquier problema se responde que no aplica: el checkout muestra
	// el envío normal y el servidor corrige el cobro si corresponde.
	return NextResponse.json({ agrupable: false, pedidos: [], sinPagar: [] });
  }
}
