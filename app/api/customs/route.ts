import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const revalidate = 60;

export async function GET() {
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("customs")
	.select("*")
	.eq("active", true)
	.order("sort_order", { ascending: true });

  if (error) {
	console.error("[CUSTOMS GET] error:", error);
	return NextResponse.json({ customs: [] });
  }

  return NextResponse.json({ customs: data });
}
