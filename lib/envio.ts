import type { SupabaseClient } from "@supabase/supabase-js";

/**
* Normaliza una dirección para poder compararla: sin tildes, sin mayúsculas y
* sin espacios de más. Dos pedidos solo se despachan juntos si la dirección
* coincide de verdad, porque direcciones distintas son dos entregas y el
* courier las cobra por separado.
*/
export function normalizarDireccion(
  direccion?: string | null,
  comuna?: string | null,
  region?: string | null
): string {
  return [direccion, comuna, region]
	.map((p) =>
  	(p || "")
    	.normalize("NFD")
    	.replace(/[̀-ͯ]/g, "") // marcas de acento sueltas tras NFD
    	.toLowerCase()
    	.replace(/\s+/g, " ")
    	.trim()
	)
	.join("|");
}

export type PedidoAgrupable = {
  id: string;
  numero: number;
  estado: string;
  total: number;
  created_at: string;
};

type Criterio = {
  email: string;
  direccion?: string | null;
  comuna?: string | null;
  region?: string | null;
  /** Pedido a excluir del resultado (el que se está mirando). */
  excluirId?: string;
};

/**
* Pedidos del mismo cliente que todavía no salieron y van a la misma dirección,
* o sea que caben en el mismo paquete.
*
* La señal de "ya salió" es el número de seguimiento: mientras no esté cargado,
* el pedido sigue en casa y se le puede sumar otro. El estado se mira además
* como respaldo, por si se despachó sin registrar el tracking.
*/
export async function buscarPedidosAgrupables(
  sb: SupabaseClient,
  { email, direccion, comuna, region, excluirId }: Criterio
): Promise<PedidoAgrupable[]> {
  if (!email?.trim()) return [];

  const { data, error } = await sb
	.from("pedidos")
	.select(
  	"id, numero, estado, total, created_at, direccion, comuna, region, tracking_numero"
	)
	.ilike("cliente_email", email.trim())
	.eq("delivery_type", "envio")
	.not("estado", "in", "(enviado,entregado)")
	.order("numero", { ascending: true });

  if (error || !data) return [];

  const objetivo = normalizarDireccion(direccion, comuna, region);

  return data
	.filter(
  	(p) =>
    	p.id !== excluirId &&
    	!p.tracking_numero &&
    	normalizarDireccion(p.direccion, p.comuna, p.region) === objetivo
	)
	.map(({ id, numero, estado, total, created_at }) => ({
  	id,
  	numero,
  	estado,
  	total,
  	created_at,
	}));
}
