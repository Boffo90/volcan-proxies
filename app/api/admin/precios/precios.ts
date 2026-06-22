import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("config")
	.select("*")
	.eq("key", "precios")
	.single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ precios: data.value });
}

export async function PATCH(req: Request) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("config")
	.update({ value: body, updated_at: new Date().toISOString() })
	.eq("key", "precios")
	.select()
	.single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ precios: data.value });
}

