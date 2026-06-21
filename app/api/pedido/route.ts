import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase";

type PedidoItem = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  finish: string;
  quantity: number;
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
  	total,
  	applied,
	} = body as {
  	nombre: string;
  	rut?: string;
  	email: string;
  	telefono?: string;
  	direccion: string;
  	comuna: string;
  	region: string;
  	notas?: string;
  	items: PedidoItem[];
  	metodo: "mp" | "transferencia";
  	total: number;
  	applied: string;
	};

	if (!nombre || !email || !direccion || !comuna || !items?.length) {
  	return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
	}

	const sb = supabaseAdmin();

	const { data: pedido, error } = await sb
  	.from("pedidos")
  	.insert({
    	cliente_nombre: nombre,
    	cliente_rut: rut,
    	cliente_email: email,
    	cliente_telefono: telefono,
    	direccion,
    	comuna,
    	region,
    	items,
    	subtotal: total,
    	promo_aplicada: applied,
    	total,
    	metodo_pago: metodo,
    	notas,
  	})
  	.select()
  	.single();

	if (error || !pedido) {
  	console.error(error);
  	return NextResponse.json(
    	{ error: "No se pudo crear el pedido" },
    	{ status: 500 }
  	);
	}

	// =========================
	// Estilos compartidos
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
	// Tabla de cartas (visual)
	// =========================
	const itemsHtml = items
  	.map(
    	(it) =>
      	`<tr>
        	<td style="padding:8px;border-bottom:1px solid #eee;">${it.quantity}×</td>
        	<td style="padding:8px;border-bottom:1px solid #eee;">
          	<b>${it.name}</b><br/>
          	<span style="color:#888;font-size:12px;">${it.set_name} · #${it.collector_number}</span>
        	</td>
        	<td style="padding:8px;border-bottom:1px solid #eee;text-transform:capitalize;color:#FF4D1A;">
          	${it.finish}
        	</td>
      	</tr>`
  	)
  	.join("");

	// =========================
	// Lista MTGO/Arena para imprimir
	// =========================
	const mtgoList = items
  	.map(
    	(it) =>
      	`${it.quantity} ${it.name} (${(it.set || "").toUpperCase()}) ${it.collector_number} [${it.finish}]`
  	)
  	.join("\n");

	// =========================
	// Mail al admin
	// =========================
	try {
  	console.log("[RESEND] Enviando mail admin...");
  	const resend = new Resend(process.env.RESEND_API_KEY);
  	const result = await resend.emails.send({
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
          	<p><b>Método de pago:</b> ${
            	metodo === "transferencia"
              	? "Transferencia (MACH BCI)"
              	: "Mercado Pago"
          	}</p>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">Cliente</h3>
            	<p style="margin:4px 0;"><b>${nombre}</b> ${rut ? `(${rut})` : ""}</p>
            	<p style="margin:4px 0;">📧 ${email}</p>
            	<p style="margin:4px 0;">📱 ${telefono || "-"}</p>
            	<p style="margin:4px 0;">📍 ${direccion}, ${comuna}, ${region}</p>
            	${
              	notas
                	? `<p style="margin:8px 0 0;color:#666;"><i>Notas: ${notas}</i></p>`
                	: ""
            	}
          	</div>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">📋 Lista para imprimir (formato MTGO)</h3>
            	<pre style="background:#0F1115;color:#FF4D1A;padding:16px;border-radius:6px;font-family:'Courier New',monospace;font-size:13px;white-space:pre-wrap;margin:0;">${mtgoList}</pre>
            	<p style="margin:12px 0 0;color:#666;font-size:12px;">
              	Tip: copia y pega esta lista en Scryfall → Tools → "Card list" para verificar antes de imprimir.
            	</p>
          	</div>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">🎴 Detalle visual</h3>
            	<table style="width:100%;border-collapse:collapse;">
              	<tbody>${itemsHtml}</tbody>
            	</table>
          	</div>

          	<div style="${boxStyle}background:#0F1115;color:white;">
            	<p style="margin:0;color:#aaa;font-size:12px;">${applied}</p>
            	<h2 style="margin:8px 0 0;color:#FF4D1A;">Total: $${total.toLocaleString("es-CL")}</h2>
          	</div>
        	</div>
      	</div>
    	`,
  	});
  	console.log("[RESEND] Admin OK:", JSON.stringify(result));
	} catch (e) {
  	console.error("[RESEND] Admin error:", e);
	}

	// =========================
	// Mail al cliente
	// =========================
	try {
  	console.log("[RESEND] Enviando mail cliente...");
  	const resend = new Resend(process.env.RESEND_API_KEY);
  	const transferInfo =
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
      	: `<p>Completa tu pago en Mercado Pago para que iniciemos la impresión de tus cartas.</p>`;

  	const result = await resend.emails.send({
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
          	<h2 style="margin-top:0;">¡Gracias por tu compra, ${nombre.split(" ")[0]}! 🎴</h2>
          	<p>Tu pedido <b style="color:#FF4D1A;">#${pedido.numero}</b> fue recibido correctamente.</p>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">Resumen del pedido</h3>
            	<table style="width:100%;border-collapse:collapse;">
              	<tbody>${itemsHtml}</tbody>
            	</table>
            	<p style="margin:16px 0 0;text-align:right;color:#aaa;font-size:12px;">${applied}</p>
            	<h2 style="margin:8px 0 0;text-align:right;color:#FF4D1A;">
              	Total: $${total.toLocaleString("es-CL")}
            	</h2>
          	</div>

          	<div style="${boxStyle}">
            	<h3 style="margin-top:0;">📦 Envío</h3>
            	<p style="margin:4px 0;">${direccion}</p>
            	<p style="margin:4px 0;">${comuna}, ${region}</p>
            	<p style="margin:12px 0 0;color:#666;font-size:13px;">
              	Envío por Starken/Chilexpress (por pagar al recibir).
            	</p>
          	</div>

          	${transferInfo}

          	<p style="margin-top:24px;color:#666;font-size:13px;text-align:center;">
            	¿Dudas? Escríbenos a <b>smyanezo@gmail.com</b><br/>
            	o vía Instagram <b>@volcanproxies</b>
          	</p>
        	</div>
      	</div>
    	`,
  	});
  	console.log("[RESEND] Cliente OK:", JSON.stringify(result));
	} catch (e) {
  	console.error("[RESEND] Cliente error:", e);
	}

	// =========================
	// Mercado Pago
	// =========================
	if (metodo === "mp") {
  	const mp = new MercadoPagoConfig({
    	accessToken: process.env.MP_ACCESS_TOKEN!,
  	});
  	const pref = new Preference(mp);
  	const result = await pref.create({
    	body: {
      	items: [
        	{
          	id: String(pedido.numero),
          	title: `Volcán Proxies - Pedido #${pedido.numero}`,
          	quantity: 1,
          	unit_price: total,
          	currency_id: "CLP",
        	},
      	],
      	payer: { name: nombre, email },
      	back_urls: {
        	success: `${process.env.NEXT_PUBLIC_SITE_URL}/gracias?pedido=${pedido.numero}`,
        	failure: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout`,
        	pending: `${process.env.NEXT_PUBLIC_SITE_URL}/gracias?pedido=${pedido.numero}&estado=pendiente`,
      	},
      	auto_return: "approved",
      	external_reference: String(pedido.id),
    	},
  	});

  	await sb
    	.from("pedidos")
    	.update({ pago_id: result.id })
    	.eq("id", pedido.id);

  	return NextResponse.json({
    	numero: pedido.numero,
    	init_point: result.init_point,
  	});
	}

	return NextResponse.json({ numero: pedido.numero });
  } catch (err) {
	console.error(err);
	return NextResponse.json({ error: "Error servidor" }, { status: 500 });
  }
}

