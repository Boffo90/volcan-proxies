import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("pedidos").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pedido: data });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const sb = supabaseAdmin();

  const { data: current } = await sb
	.from("pedidos")
	.select("estado, historial")
	.eq("id", id)
	.single();

  const updates: Record<string, unknown> = {};

  if (body.estado && current && body.estado !== current.estado) {
	const newEntry = {
  	from: current.estado,
  	to: body.estado,
  	at: new Date().toISOString(),
	};
	const historial = Array.isArray(current.historial) ? current.historial : [];
	updates.estado = body.estado;
	updates.historial = [...historial, newEntry];
  }
  if (body.admin_notas !== undefined) updates.admin_notas = body.admin_notas;

  const { data, error } = await sb
	.from("pedidos")
	.update(updates)
	.eq("id", id)
	.select()
	.single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pedido: data });
}

