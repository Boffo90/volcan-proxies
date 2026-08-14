import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Datos mínimos del pedido para armar el email de confirmación. */
export type PedidoConfirmacion = {
  numero: number;
  cliente_nombre: string;
  cliente_email: string;
  total: number;
  delivery_type?: string;
  direccion?: string;
  comuna?: string;
  region?: string;
};

const baseStyle =
  "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222;";
const headerStyle =
  "background: #0F1115; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;";
const bodyStyle =
  "background: #fafafa; padding: 24px; border-radius: 0 0 8px 8px;";
const boxStyle =
  "background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #eee;";

/**
* Marca el pedido como "confirmación ya avisada" y devuelve si nos toca enviar.
*
* El UPDATE es condicional (solo si la marca está vacía), así dos llamadas
* simultáneas no mandan el email dos veces — importante porque Flow reintenta
* su webhook de confirmación.
*
* Si la columna todavía no existe (migración pendiente) dejamos pasar el envío:
* es preferible un email repetido a que el cliente no reciba ninguno.
*/
export async function reclamarConfirmacion(
  sb: SupabaseClient,
  pedidoId: string
): Promise<boolean> {
  const { data, error } = await sb
	.from("pedidos")
	.update({ confirmacion_enviada_at: new Date().toISOString() })
	.eq("id", pedidoId)
	.is("confirmacion_enviada_at", null)
	.select("id");

  if (error) {
	const columnaFalta =
  	error.code === "PGRST204" ||
  	error.code === "42703" ||
  	/column|schema cache/i.test(error.message || "");
	if (columnaFalta) return true;
	console.error("[CONFIRMACION] no se pudo reclamar el envío:", error);
	return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
* Suelta la marca de confirmación cuando el envío falló.
*
* reclamarConfirmacion marca antes de enviar para que dos llamadas simultáneas
* no manden el correo dos veces. El costo es que un envío fallido dejaría el
* pedido marcado como avisado para siempre, sin forma de reintentar: por eso
* hay que soltarla explícitamente.
*/
export async function liberarConfirmacion(
  sb: SupabaseClient,
  pedidoId: string
): Promise<void> {
  const { error } = await sb
	.from("pedidos")
	.update({ confirmacion_enviada_at: null })
	.eq("id", pedidoId);
  if (error) console.error("[CONFIRMACION] no se pudo liberar la marca:", error);
}

/** Casilla de contacto: adonde responde el cliente si contesta un automático. */
export const CONTACTO_EMAIL = "volcanproxies@gmail.com";

/** HTML del email de confirmación (separado del envío para poder revisarlo). */
export function construirHtmlConfirmacion(pedido: PedidoConfirmacion): string {
  const siteUrl = (
	process.env.NEXT_PUBLIC_SITE_URL || "https://www.volcanproxies.cl"
  ).replace(/\/$/, "");
  const seguimientoUrl = siteUrl + "/seguimiento/" + pedido.numero;

  const esRetiro = pedido.delivery_type === "retiro";

  // En retiro no hay courier ni número de seguimiento, así que prometer uno
  // sería información equivocada: ahí avisamos que coordinamos el retiro.
  const entregaInfo = esRetiro
	? `
  	<div style="${boxStyle}">
    	<h3 style="margin-top:0;">📍 Retiro en Pucón</h3>
    	<p style="margin:4px 0;">
      	Te escribimos a este mismo correo para coordinar el retiro en cuanto
      	tu pedido esté listo.
    	</p>
  	</div>
	`
	: `
  	<div style="${boxStyle}">
    	<h3 style="margin-top:0;">📦 Envío</h3>
    	<p style="margin:4px 0;">${pedido.direccion || ""}</p>
    	<p style="margin:4px 0;">${pedido.comuna || ""}${
      	pedido.region ? ", " + pedido.region : ""
    	}</p>
    	<p style="margin:12px 0 0;">
      	Apenas tu pedido esté enviado te mandamos el <b>número de
      	seguimiento</b> a este correo para que puedas rastrearlo.
    	</p>
  	</div>
	`;

  return `
  	<div style="${baseStyle}">
    	<div style="${headerStyle}">
      	<h1 style="margin:0;">🌋 VOLCÁN <span style="color:#FF4D1A;">PROXIES</span></h1>
      	<p style="margin:8px 0 0;color:#aaa;">Tu pedido está confirmado</p>
    	</div>

    	<div style="${bodyStyle}">
      	<h2 style="margin-top:0;">¡Listo, ${
        	pedido.cliente_nombre.split(" ")[0]
      	}! ✅</h2>

      	<p>
        	Recibimos tu pago y tu pedido
        	<b style="color:#FF4D1A;">#${pedido.numero}</b> quedó
        	<b>confirmado</b>. Ya entró a la fila de producción.
      	</p>

      	<div style="${boxStyle}">
        	<h3 style="margin-top:0;">Resumen</h3>
        	<p style="margin:4px 0;"><b>Pedido:</b> #${pedido.numero}</p>
        	<p style="margin:4px 0;"><b>Total pagado:</b> $${pedido.total.toLocaleString(
          	"es-CL"
        	)}</p>
      	</div>

      	${entregaInfo}

      	<div style="${boxStyle}">
        	<h3 style="margin-top:0;">🔍 Sigue tu pedido</h3>
        	<p style="margin:4px 0;">Puedes ver el estado en cualquier momento aquí:</p>
        	<p style="margin:8px 0;color:#FF4D1A;font-weight:bold;">
          	${seguimientoUrl}
        	</p>
      	</div>

      	<p style="margin-top:24px;color:#666;font-size:13px;text-align:center;">
        	¿Dudas? Escríbenos a <b>volcanproxies@gmail.com</b><br/>
        	o vía Instagram <b>@volcanproxies</b>
      	</p>
    	</div>
  	</div>
	`;
}

/** Email al cliente avisando que su pago quedó confirmado. */
export async function enviarEmailConfirmacion(pedido: PedidoConfirmacion) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
	from: process.env.EMAIL_FROM!,
	to: pedido.cliente_email,
	// Si el cliente responde este correo, que llegue a la casilla de contacto
	// y no a una dirección de envío que nadie lee.
	replyTo: CONTACTO_EMAIL,
	subject: `✅ Pedido #${pedido.numero} confirmado - Volcán Proxies`,
	html: construirHtmlConfirmacion(pedido),
  });
}
