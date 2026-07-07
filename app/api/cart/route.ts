import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const sb = await supabaseServer();
  const {
	data: { user },
  } = await sb.auth.getUser();

  if (!user) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data } = await admin
	.from("carritos")
	.select("items")
	.eq("user_id", user.id)
	.single();

  return NextResponse.json({ items: data?.items || [] });
}

export async function PUT(req: Request) {
  const sb = await supabaseServer();
  const {
	data: { user },
  } = await sb.auth.getUser();

  if (!user) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await req.json();

  const admin = supabaseAdmin();
  const { error } = await admin.from("carritos").upsert({
	user_id: user.id,
	items,
	updated_at: new Date().toISOString(),
  });

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
