import { supabaseAdmin } from "@/lib/supabase";
import { PRECIOS_DEFAULT, type Precios } from "@/lib/pricing";

export async function getPreciosServer(): Promise<Precios> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("config")
	.select("value")
	.eq("key", "precios")
	.single();

  if (error || !data) return PRECIOS_DEFAULT;
  return { ...PRECIOS_DEFAULT, ...data.value };
}
