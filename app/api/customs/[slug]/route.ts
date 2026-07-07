import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("customs")
	.select("*")
	.eq("slug", slug)
	.eq("active", true)
	.single();

  if (error || !data) {
	return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ custom: data });
}
