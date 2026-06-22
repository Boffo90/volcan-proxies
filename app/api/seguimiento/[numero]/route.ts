import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  const { numero } = await params;
  const numNumero = parseInt(numero, 10);
  if (isNaN(numNumero)) {
	return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("pedidos")
	.select(
  	"numero, estado, created_at, total, tracking_numero, tracking_courier, fecha_envio, historial"
	)
	.eq("numero", numNumero)
	.single();

  if (error || !data) {
	return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ pedido: data });
}

