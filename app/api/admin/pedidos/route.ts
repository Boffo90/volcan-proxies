import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { esColumnaFaltante } from "@/lib/db";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verArchivados =
	new URL(req.url).searchParams.get("archivados") === "1";

  const sb = supabaseAdmin();
  const consulta = () =>
	sb.from("pedidos").select("*").order("created_at", { ascending: false });

  // Los archivados quedan fuera del panel salvo que se pidan explícitamente.
  let { data, error } = verArchivados
	? await consulta()
	: await consulta().is("archivado_at", null);

  // Si la migración de archivado todavía no se corrió, se listan todos.
  if (error && esColumnaFaltante(error)) {
	({ data, error } = await consulta());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pedidos: data });
}
