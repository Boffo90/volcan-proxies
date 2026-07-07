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
  const { data, error } = await admin
	.from("pedidos")
	.select("id, numero, total, estado, metodo_pago, created_at")
	.eq("user_id", user.id)
	.order("created_at", { ascending: false });

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pedidos: data });
}
