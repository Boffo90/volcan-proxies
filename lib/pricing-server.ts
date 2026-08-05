import { supabaseAdmin } from "@/lib/supabase";
import { PRECIOS_DEFAULT, normalizePrecios, type Precios } from "@/lib/pricing";

export async function getPreciosServer(): Promise<Precios> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("config")
	.select("value")
	.eq("key", "precios")
	.single();

  if (error || !data) return PRECIOS_DEFAULT;
  // normalizePrecios entiende tanto el formato nuevo (registros por acabado)
  // como el viejo y plano; un spread simple dejaría los precios en undefined
  // mientras la config no se haya vuelto a guardar desde el admin.
  return normalizePrecios(data.value);
}
