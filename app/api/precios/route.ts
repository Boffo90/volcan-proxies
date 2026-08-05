import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PRECIOS_DEFAULT, normalizePrecios } from "@/lib/pricing";

export const revalidate = 60; // cache de 60 segundos

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("config")
	.select("value")
	.eq("key", "precios")
	.single();

  // Fallback a precios por defecto si falla Supabase.
  if (error || !data) {
	return NextResponse.json(PRECIOS_DEFAULT);
  }

  // Se normaliza acá para que el cliente reciba siempre la misma forma, venga
  // la config en el formato nuevo o en el viejo de dos acabados.
  return NextResponse.json(normalizePrecios(data.value));
}
