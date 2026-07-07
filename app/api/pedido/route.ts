import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabaseServer";
import { createFlowPayment } from "@/lib/flow";
import { MIN_CARDS, SHIPPING_COST, calculateTotalWith } from "@/lib/pricing";
import { getPreciosServer } from "@/lib/pricing-server";

type PedidoItem = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  image?: string;
  finish: string;
  quantity: number;
  isCustom?: boolean;
};

export async function POST(req: Request) {
  try {
	const body = await req.json();

	const {
  	nombre,
  	rut,
  	email,
  	telefono,
  	direccion,
  	comuna,
  	region,
  	notas,
  	items,
  	metodo,
  	deliveryType,
  	aceptaTerminos,
	} = body as {
  	nombre: string;
  	rut?: string;
  	email: string;
  	telefono?: string;
  	direccion?: string;
  	comuna?: string;
  	region?: string;
  	notas?: string;
  	items: PedidoItem[];
  	metodo: "flow" | "transferencia";
  	deliveryType: "retiro" | "envio";
  	aceptaTerminos: boolean;
	};

	if (!nombre || !email || !items?.length) {
  	return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
	}

	if (!aceptaTerminos) {
  	return NextResponse.json(
    	{ error: "Debes aceptar los términos del producto artesanal" },
    	{ status: 400 }
  	);
	}

	if (deliveryType === "envio") {
  	if (!direccion || !comuna || !region) {
    	return NextResponse.json(
      	{ error: "Faltan datos de envío" },
      	{ status: 400 }
    	);
  	}
	}

	const totalQty = items.reduce((s, i) => s + i.quantity, 0);

	if (totalQty < MIN_CARDS) {
  	return NextResponse.json(
    	{ error: `Pedido mínimo: ${MIN_CARDS} cartas` },
    	{ status: 400 }
  	);
	}

	// El total nunca se confía del cliente: se recalcula server-side con
	// los precios vigentes en Supabase para evitar manipulación del monto a pagar.
	const precios = await getPreciosServer();
	const { total: subtotal, applied } = calculateTotalWith(
  	precios,
  	items.map((i) => ({
    	finish: i.finish as "glossy" | "matte",
    	quantity: i.quantity,
    	isCustom: i.isCustom,
  	}))
	);
	const shippingCost = deliveryType === "envio" ? SHIPPING_COST : 0;
	const total = subtotal + shippingCost;

	const authClient = await supabaseServer();
	const {
  	data: { user },
	} = await authClient.auth.getUser();

	const sb = supabaseAdmin();

	const direccionFinal =
  	deliveryType === "retiro"
    	? "Retiro en Pucón (a coordinar)"
    	: direccion || "";
	const comunaFinal = deliveryType === "retiro" ? "Pucón" : comuna || "";
	const regionFinal =
  	deliveryType === "retiro" ? "Araucanía" : region || "";

	const pedidoBase = {
  	cliente_nombre: nombre,
  	cliente_rut: rut,
  	cliente_email: email,
  	cliente_telefono: telefono,
  	direccion: direccionFinal,
  	comuna: comunaFinal,
  	region: regionFinal,
  	items,
  	subtotal: subtotal,
  	promo_aplicada: applied,
  	total,
  	metodo_pago: metodo,
  	notas,
  	delivery_type: deliveryType,
  	shipping_cost: shippingCost,
  	acepta_terminos: aceptaTerminos,
	};

	let { data: pedido, error } = await sb
  	.from("pedidos")
  	.insert({ ...pedidoBase, user_id: user?.id ?? null })
  	.select()
  	.single();

	if (error?.code === "42703") {
  	// La columna user_id todavía no existe en Supabase (falta correr la
  	// migración supabase/migrations/20260707_login_carritos.sql). Reintenta
  	// sin asociar el pedido a un usuario para no romper el checkout.
  	({ data: pedido, error } = await sb
    	.from("pedidos")
    	.insert(pedidoBase)
    	.select()
    	.single());
	}

	if (error || !pedido) {
  	console.error("[PEDIDO INSERT ERROR]", error);
  	return NextResponse.json(
    	{ error: "No se pudo crear el pedido" },
    	{ status: 500 }
  	);
	}

	const siteUrl =
  	process.env.NEXT_PUBLIC_SITE_URL || "https://volcanproxies.cl";

	const seguimientoUrl = siteUrl + "/seguimiento/" + pedido.numero;

	let paymentUrl: string | null = null;

	// =========================
	// Crear pago Flow.cl
	// =========================
	if (metodo === "flow") {
  	try {
    	const flowPayment = await createFlowPayment({
      	commerceOrder: String(pedido.id),
      	subject: `Volcán Proxies - Pedido #${pedido.numero}`,
      	amount: total,
      	email,
      	urlConfirmation: siteUrl + "/api/flow/confirm",
      	urlReturn:
        	siteUrl + "/gracias?pedido=" + pedido.numero + "&metodo=flow",
    	});

    	paymentUrl = flowPayment.url + "?token=" + flowPayment.token;

    	await sb
      	.from("pedidos")
      	.update({
        	flow_token: flowPayment.token,
        	flow_order: flowPayment.flowOrder
          	? String(flowPayment.flowOrder)
          	: null,
        	metodo_pago: "flow",
      	})
      	.eq("id", pedido.id);
  	} catch (flowError) {
    	console.error("[FLOW CREATE ERROR]", flowError);

    	const flowMessage =
      	flowError instanceof Error
        	? flowError.message
        	: "No se pudo iniciar el pago con Flow.cl";

    	return NextResponse.json(
      	{
        	error: flowMessage,
      	},
      	{ status: 500 }
    	);
  	}
	}

	// =========================
	// Estilos email
	// =========================
	const baseStyle =
  	"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #222;";
	const headerStyle =
  	"background: #0F1115; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;";
	const bodyStyle =
  	"background: #fafafa; padding: 24px; border-radius: 0 0 8px 8px;";
	const boxStyle =
  	"background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #eee;";

	// =========================
	// Tabla visual de cartas
	// =========================
	const itemsHtml = items
  	.map((it) => {
    	const customLabel = it.isCustom ? "CUSTOM" : it.set_name;
    	const collector = it.isCustom ? "" : " · #" + it.collector_number;

    	return `<tr>
      	<td style="padding:8px;border-bottom:1px solid #eee;">${it.quantity}×</td>
      	<td style="padding:8px;border-bottom:1px solid #eee;">
        	<b>${it.name}</b><br/>
        	<span style="color:#888;font-size:12px;">${customLabel}${collector}</span>
      	</td>
      	<td style="padding:8px;border-bottom:1px solid #eee;text-transform:capitalize;color:#FF4D1A;">
        	${it.finish}
      	</td>
    	</tr>`;
  	})
  	.join("");

	// =========================
	// Lista formato MTGO/Admin
	// =========================
	const mtgoList = items
  	.map((it) => {
    	if (it.isCustom) {
      	return `${it.quantity} [CUSTOM] ${it.name} [${it.finish}]`;
    	}

    	return `${it.quantity} ${it.name} (${(it.set || "").toUpperCase()}) ${
      	it.collector_number
    	} [${it.finish}]`;
  	})
  	.join("\n");

	const metodoLabel =
  	metodo === "flow" ? "Flow.cl" : "Transferencia (MACH BCI)";

	const entregaLabel =
  	deliveryType === "retiro"
    	? "Retiro en Pucón (a coordinar)"
    	: "Envío a domicilio";

	// =========================
	// Mail al admin
	// =========================
	try {
  	const resend = new Resend(process.env.RESEND_API_KEY);

  	const direccionHtml =
    	deliveryType === "retiro"
      	? "<p>📍 <b>Retiro en Pucón</b> (coordinar por email)</p>"
      	: `<p>📍 ${direccionFinal}, ${comunaFinal}, ${regionFinal}</p>`;

  	await resend.emails.send({
    	from: process.env.EMAIL_FROM!,
    	to: process.env.EMAIL_ADMIN!,
    	subject: `🌋 Nuevo pedido #${pedido.numero} - ${nombre}`,
    	html: `
      	<div style="${baseStyle}">
        	<div style="${headerStyle}">
          	<h1 style="margin:0;">🌋 VOLCÁN <span style="color:#FF4D1A;">PROXIES</span></h1>
          	<p style="margin:8px 0 0;color:#aaa;">Nuevo pedido recibido</p>
        	</div>

        	<div style="${bodyStyle}">
          	<h2 style="margin-top:0;">Pedido #${pedido.numero}</h2>
          	<p><b>Método de pago:</b> ${metodoLabel}</p>
          	<p><b>Entrega:</b> ${entregaLabel}</p>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">Cliente</h3>
            	<p style="margin:4px 0;"><b>${nombre}</b> ${
              	rut ? `(${rut})` : ""
            	}</p>
            	<p style="margin:4px 0;">📧 ${email}</p>
            	<p style="margin:4px 0;">📱 ${telefono || "-"}</p>
            	${direccionHtml}
            	${
              	notas
                	? `<p style="margin:8px 0 0;color:#666;"><i>Notas: ${notas}</i></p>`
                	: ""
            	}
          	</div>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">📋 Lista para imprimir</h3>
            	<pre style="background:#0F1115;color:#FF4D1A;padding:16px;border-radius:6px;font-family:'Courier New',monospace;font-size:13px;white-space:pre-wrap;margin:0;">${mtgoList}</pre>
          	</div>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">🎴 Detalle visual</h3>
            	<table style="width:100%;border-collapse:collapse;">
              	<tbody>${itemsHtml}</tbody>
            	</table>
          	</div>

          	<div style="${boxStyle}background:#0F1115;color:white;">
            	<p style="margin:0;color:#aaa;font-size:12px;">${applied}</p>
            	<p style="margin:4px 0;color:#aaa;font-size:13px;">Subtotal: $${subtotal.toLocaleString(
              	"es-CL"
            	)}</p>
            	<p style="margin:4px 0;color:#aaa;font-size:13px;">Envío: $${shippingCost.toLocaleString(
              	"es-CL"
            	)}</p>
            	<h2 style="margin:8px 0 0;color:#FF4D1A;">Total: $${total.toLocaleString(
              	"es-CL"
            	)}</h2>
          	</div>
        	</div>
      	</div>
    	`,
  	});
	} catch (e) {
  	console.error("[EMAIL ADMIN ERROR]", e);
	}

	// =========================
	// Mail al cliente
	// =========================
	try {
  	const resend = new Resend(process.env.RESEND_API_KEY);

  	const paymentInfo =
    	metodo === "transferencia"
      	? `
        	<div style="${boxStyle}">
          	<h3 style="margin-top:0;">💳 Datos para transferencia</h3>
          	<p style="margin:4px 0;"><b>Banco:</b> BCI</p>
          	<p style="margin:4px 0;"><b>Tipo:</b> Cuenta Vista (MACH)</p>
          	<p style="margin:4px 0;"><b>Número:</b> 777017598354</p>
          	<p style="margin:4px 0;"><b>Nombre:</b> Sebastian Yáñez</p>
          	<p style="margin:4px 0;"><b>RUT:</b> 17.598.354-6</p>
          	<p style="margin:4px 0;"><b>Email:</b> smyanezo@gmail.com</p>
          	<p style="margin:16px 0 0;color:#666;font-size:13px;">
            	Una vez transferido, envía el comprobante a <b>smyanezo@gmail.com</b>
            	indicando tu pedido <b>#${pedido.numero}</b>.
          	</p>
        	</div>
      	`
      	: `
        	<div style="${boxStyle}">
          	<h3 style="margin-top:0;">💳 Pago con Flow.cl</h3>
          	<p style="margin:4px 0;">
            	Tu pedido fue creado y quedará confirmado una vez que Flow.cl informe el pago aprobado.
          	</p>
        	</div>
      	`;

  	const entregaInfo =
    	deliveryType === "retiro"
      	? `
        	<div style="${boxStyle}">
          	<h3 style="margin-top:0;">📍 Retiro en Pucón</h3>
          	<p style="margin:4px 0;">
            	Al confirmar tu pago te contactaremos por email para coordinar
            	el retiro. Sin costo adicional.
          	</p>
        	</div>
      	`
      	: `
        	<div style="${boxStyle}">
          	<h3 style="margin-top:0;">📦 Envío</h3>
          	<p style="margin:4px 0;">${direccionFinal}</p>
          	<p style="margin:4px 0;">${comunaFinal}, ${regionFinal}</p>
          	<p style="margin:12px 0 0;color:#666;font-size:13px;">
            	Dejamos tu pedido despachado en máximo 48 hrs desde la
            	confirmación del pago vía Starken, Chilexpress o Blue Express.
          	</p>
        	</div>
      	`;

  	await resend.emails.send({
    	from: process.env.EMAIL_FROM!,
    	to: email,
    	subject: `🌋 Pedido #${pedido.numero} recibido - Volcán Proxies`,
    	html: `
      	<div style="${baseStyle}">
        	<div style="${headerStyle}">
          	<h1 style="margin:0;">🌋 VOLCÁN <span style="color:#FF4D1A;">PROXIES</span></h1>
          	<p style="margin:8px 0 0;color:#aaa;">Proxies de calidad, hechas en Pucón</p>
        	</div>

        	<div style="${bodyStyle}">
          	<h2 style="margin-top:0;">¡Gracias por tu compra, ${
            	nombre.split(" ")[0]
          	}! 🎴</h2>

          	<p>
            	Tu pedido <b style="color:#FF4D1A;">#${pedido.numero}</b> fue recibido correctamente.
          	</p>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">Resumen del pedido</h3>
            	<table style="width:100%;border-collapse:collapse;">
              	<tbody>${itemsHtml}</tbody>
            	</table>

            	<p style="margin:16px 0 0;text-align:right;color:#aaa;font-size:12px;">${applied}</p>
            	<p style="margin:4px 0;text-align:right;color:#666;font-size:13px;">Subtotal: $${subtotal.toLocaleString(
              	"es-CL"
            	)}</p>
            	<p style="margin:4px 0;text-align:right;color:#666;font-size:13px;">${
              	deliveryType === "retiro"
                	? "Retiro: Gratis"
                	: "Envío: $" + shippingCost.toLocaleString("es-CL")
            	}</p>
            	<h2 style="margin:8px 0 0;text-align:right;color:#FF4D1A;">
              	Total: $${total.toLocaleString("es-CL")}
            	</h2>
          	</div>

          	${entregaInfo}

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">🔍 Sigue tu pedido</h3>
            	<p style="margin:4px 0;">Puedes ver el estado en cualquier momento aquí:</p>
            	<p style="margin:8px 0;color:#FF4D1A;font-weight:bold;">
              	${seguimientoUrl}
            	</p>
          	</div>

          	${paymentInfo}

          	<p style="margin-top:24px;color:#666;font-size:13px;text-align:center;">
            	¿Dudas? Escríbenos a <b>smyanezo@gmail.com</b><br/>
            	o vía Instagram <b>@volcanproxies</b>
          	</p>
        	</div>
      	</div>
    	`,
  	});
	} catch (e) {
  	console.error("[EMAIL CLIENTE ERROR]", e);
	}

	if (metodo === "flow") {
  	return NextResponse.json({
    	numero: pedido.numero,
    	payment_url: paymentUrl,
  	});
	}

	return NextResponse.json({
  	numero: pedido.numero,
	});
  } catch (err) {
	console.error("[PEDIDO SERVER ERROR]", err);
	return NextResponse.json({ error: "Error servidor" }, { status: 500 });
  }
}

