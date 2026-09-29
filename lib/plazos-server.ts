import { supabaseAdmin } from "@/lib/supabase";
import { PLAZOS_DEFAULT, normalizePlazos, type Plazos } from "@/lib/plazos";

/**
 * El plazo vigente, leído en el servidor.
 *
 * Lo usa el correo de confirmación, que es donde la promesa queda por escrito.
 * Si la fila no existe todavía se cae al valor por defecto: es preferible
 * prometer 48 horas que no decir nada.
 */
export async function getPlazosServer(): Promise<Plazos> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
	.from("config")
	.select("value")
	.eq("key", "plazos")
	.single();

  if (error || !data) return PLAZOS_DEFAULT;
  return normalizePlazos(data.value);
}
