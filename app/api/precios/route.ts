import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 60; // cache de 60 segundos

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("config")
	.select("value")
	.eq("key", "precios")
	.single();

  if (error || !data) {
	// Fallback a precios por defecto si falla Supabase
	return NextResponse.json({
  	glossy: 150,
  	matte: 200,
  	mazo60_glossy: 7900,
  	mazo60_matte: 10900,
  	commander100_glossy: 12900,
  	commander100_matte: 17900,
  	custom_surcharge: 50,
	});
  }

  return NextResponse.json(data.value);
}

