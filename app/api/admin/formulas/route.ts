import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizeFormulas } from "@/lib/formulas";

export async function GET() {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data } = await sb
	.from("config")
	.select("value")
	.eq("key", "formulas")
	.single();

  return NextResponse.json({ formulas: normalizeFormulas(data?.value) });
}

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const formulas = normalizeFormulas(body?.formulas);

  const sb = supabaseAdmin();
  // upsert: la fila de formulas puede no existir todavía.
  const { error } = await sb
	.from("config")
	.upsert(
  	{ key: "formulas", value: formulas, updated_at: new Date().toISOString() },
  	{ onConflict: "key" }
	);

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ formulas });
}
