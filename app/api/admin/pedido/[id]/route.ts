import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  enviarEmailConfirmacion,
  reclamarConfirmacion,
} from "@/lib/emailPedido";
import { buscarPedidosAgrupables, REGIONES } from "@/lib/envio";
import { Resend } from "resend";

const COURIER_NAMES: Record<string, string> = {
  starken: "Starken",
  chilexpress: "Chilexpress",
  bluexpress: "Blue Express",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = supabaseAdmin();

  const { data, error } = await sb
	.from("pedidos")
	.select("*")
	.eq("id", id)
	.single();

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Otros pedidos del mismo cliente, a la misma dirección y sin despachar:
  // van en el mismo paquete y el envío se cobró una sola vez.
  const agrupables =
	data.delivery_type === "envio"
  	? await buscarPedidosAgrupables(sb, {
      	email: data.cliente_email,
      	direccion: data.direccion,
      	comuna: data.comuna,
      	region: data.region,
      	excluirId: data.id,
    	})
  	: [];

  return NextResponse.json({ pedido: data, agrupables });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const sb = supabaseAdmin();

  const { data: current } = await sb
	.from("pedidos")
	.select(
  	"estado, historial, numero, cliente_nombre, cliente_email, direccion, comuna, region, total, delivery_type, tracking_numero, admin_notas"
	)
	.eq("id", id)
	.single();

  const updates: Record<string, unknown> = {};
  let triggerTrackingEmail = false;

  // "Confirmar pago y avisar al cliente": deja el pedido en pagado y manda el
  // email de confirmación. Es lo mismo que avanzar el estado, pero explícito.
  const quiereConfirmar = body.confirmar === true;
  const nuevoEstado = quiereConfirmar ? "pagado" : body.estado;

  if (nuevoEstado && current && nuevoEstado !== current.estado) {
	const newEntry = {
  	from: current.estado,
  	to: nuevoEstado,
  	at: new Date().toISOString(),
	};

	const historial = Array.isArray(current.historial) ? current.historial : [];

	updates.estado = nuevoEstado;
	updates.historial = [...historial, newEntry];
  }

  if (body.admin_notas !== undefined) {
	updates.admin_notas = body.admin_notas;
  }

  // Corregir los datos de despacho (dirección equivocada, cambio de casa).
  // Se bloquea si el paquete ya salió: cambiar la dirección de algo que está
  // en manos del courier no sirve de nada y borra a dónde se envió de verdad.
  if (body.envio !== undefined) {
	if (current?.tracking_numero) {
  	return NextResponse.json(
    	{
      	error:
        	"Este pedido ya tiene tracking, así que el paquete salió con la dirección actual. Coordina el cambio con el courier.",
    	},
    	{ status: 400 }
  	);
	}

	const e = body.envio as Record<string, unknown>;
	const texto = (v: unknown, max: number) =>
  	typeof v === "string" ? v.trim().slice(0, max) : undefined;

	const nuevaDireccion = texto(e.direccion, 200);
	const nuevaComuna = texto(e.comuna, 80);
	const nuevaRegion = texto(e.region, 80);
	const nuevoNombre = texto(e.cliente_nombre, 120);
	const nuevoTelefono = texto(e.cliente_telefono, 40);

	if (!nuevaDireccion || !nuevaComuna || !nuevaRegion) {
  	return NextResponse.json(
    	{ error: "Dirección, comuna y región no pueden quedar vacías" },
    	{ status: 400 }
  	);
	}
	if (!REGIONES.includes(nuevaRegion as (typeof REGIONES)[number])) {
  	return NextResponse.json({ error: "Región no válida" }, { status: 400 });
	}

	updates.direccion = nuevaDireccion;
	updates.comuna = nuevaComuna;
	updates.region = nuevaRegion;
	if (nuevoNombre) updates.cliente_nombre = nuevoNombre;
	if (nuevoTelefono !== undefined) updates.cliente_telefono = nuevoTelefono;

	// Queda registro en las notas internas: si el paquete llega a la
	// dirección equivocada, hay que poder ver qué se cambió y cuándo.
	const antes = `${current?.direccion ?? ""}, ${current?.comuna ?? ""}, ${
  	current?.region ?? ""
	}`;
	const despues = `${nuevaDireccion}, ${nuevaComuna}, ${nuevaRegion}`;
	if (antes !== despues) {
  	const linea = `[${new Date().toLocaleString(
    	"es-CL"
  	)}] Dirección cambiada: "${antes}" → "${despues}"`;
  	const previas =
    	typeof updates.admin_notas === "string"
      	? updates.admin_notas
      	: current?.admin_notas || "";
  	updates.admin_notas = previas ? `${previas}\n${linea}` : linea;
	}
  }

  // Cambiar el método de pago: pasa cuando el cliente no logra pagar con Flow
  // y termina transfiriendo (o al revés). Se valida contra la lista real para
  // que no entre cualquier texto y deje el pedido en un estado raro.
  if (body.metodo_pago !== undefined) {
	if (!["flow", "transferencia"].includes(body.metodo_pago)) {
  	return NextResponse.json(
    	{ error: "Método de pago inválido" },
    	{ status: 400 }
  	);
	}
	updates.metodo_pago = body.metodo_pago;
  }

  if (body.tracking_numero !== undefined) {
	updates.tracking_numero = body.tracking_numero;
	triggerTrackingEmail = !!body.tracking_numero;
  }

  if (body.tracking_courier !== undefined) {
	updates.tracking_courier = body.tracking_courier;
  }

  if (body.fecha_envio !== undefined) {
	updates.fecha_envio = body.fecha_envio;
  }

  // Confirmar un pedido que ya estaba en "pagado" no cambia ninguna columna;
  // en ese caso saltamos el update (un PATCH vacío falla) y solo leemos.
  const query =
	Object.keys(updates).length > 0
  	? sb.from("pedidos").update(updates).eq("id", id).select().single()
  	: sb.from("pedidos").select().eq("id", id).single();

  const { data, error } = await query;

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // "enviado" = salió el correo ahora; "ya_enviado" = el cliente ya había sido
  // avisado antes, así que no se repite.
  let confirmacion: "enviado" | "ya_enviado" | "error" | null = null;

  if (quiereConfirmar && current) {
	try {
  	const nosTocaEnviar = await reclamarConfirmacion(sb, id);
  	if (nosTocaEnviar) {
    	await enviarEmailConfirmacion({
      	numero: current.numero,
      	cliente_nombre: current.cliente_nombre,
      	cliente_email: current.cliente_email,
      	total: current.total,
      	delivery_type: current.delivery_type,
      	direccion: current.direccion,
      	comuna: current.comuna,
      	region: current.region,
    	});
    	confirmacion = "enviado";
  	} else {
    	confirmacion = "ya_enviado";
  	}
	} catch (e) {
  	console.error("[CONFIRMACION EMAIL] error:", e);
  	confirmacion = "error";
	}
  }

  if (triggerTrackingEmail && current) {
	try {
  	const resend = new Resend(process.env.RESEND_API_KEY);

  	const courierKey = (body.tracking_courier || "courier") as string;
  	const courierName = COURIER_NAMES[courierKey] || "Courier";
  	const trackingNum = body.tracking_numero as string;
  	const siteUrl =
    	process.env.NEXT_PUBLIC_SITE_URL || "https://volcanproxies.cl";

  	let trackingLink = "";

  	if (courierKey === "starken") {
    	trackingLink =
      	"https://www.starken.cl/seguimiento?codigo=" + trackingNum;
  	} else if (courierKey === "chilexpress") {
    	trackingLink =
      	"https://www.chilexpress.cl/Views/ChilexpressCL/Seguimiento.aspx?TrackingNumber=" +
      	trackingNum;
  	} else if (courierKey === "bluexpress") {
    	trackingLink =
      	"https://www.blue.cl/seguimiento/?n_seguimiento=" + trackingNum;
  	}

  	const seguimientoLocalUrl =
    	siteUrl + "/seguimiento/" + current.numero;

  	const trackingButtonHtml = trackingLink
    	? '<p style="margin:16px 0 0;">' +
      	trackingLink +
      	'Rastrear en ' +
      	courierName +
      	" →</a></p>"
    	: "";

  	const seguimientoLinkHtml =
    	'' +
    	seguimientoLocalUrl +
    	'' +
    	seguimientoLocalUrl +
    	"</a>";

  	const html =
    	'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">' +
    	'<div style="background:#0F1115;color:white;padding:24px;text-align:center;border-radius:8px 8px 0 0;">' +
    	'<h1 style="margin:0;">🌋 VOLCÁN <span style="color:#FF4D1A;">PROXIES</span></h1>' +
    	'<p style="margin:8px 0 0;color:#aaa;">Tu pedido está en camino</p>' +
    	"</div>" +
    	'<div style="background:#fafafa;padding:24px;border-radius:0 0 8px 8px;">' +
    	"<h2>¡Hola " +
    	current.cliente_nombre.split(" ")[0] +
    	"! 📦</h2>" +
    	'<p>Tu pedido <b style="color:#FF4D1A;">#' +
    	current.numero +
    	"</b> ya fue despachado.</p>" +
    	'<div style="background:white;padding:16px;border-radius:6px;margin:16px 0;border:1px solid #eee;">' +
    	'<h3 style="margin-top:0;">Datos de seguimiento</h3>' +
    	'<p style="margin:4px 0;"><b>Courier:</b> ' +
    	courierName +
    	"</p>" +
    	'<p style="margin:4px 0;"><b>N° seguimiento:</b> <span style="color:#FF4D1A;font-weight:bold;">' +
    	trackingNum +
    	"</span></p>" +
    	trackingButtonHtml +
    	"</div>" +
    	'<div style="background:white;padding:16px;border-radius:6px;margin:16px 0;border:1px solid #eee;">' +
    	'<h3 style="margin-top:0;">📍 Dirección de envío</h3>' +
    	'<p style="margin:4px 0;">' +
    	current.direccion +
    	"</p>" +
    	'<p style="margin:4px 0;">' +
    	current.comuna +
    	", " +
    	current.region +
    	"</p>" +
    	"</div>" +
    	'<p style="margin:16px 0;">También puedes seguir tu pedido en cualquier momento aquí:</p>' +
    	"<p>" +
    	seguimientoLinkHtml +
    	"</p>" +
    	'<p style="margin-top:24px;color:#666;font-size:13px;text-align:center;">' +
    	"¿Dudas? Escríbenos a <b>smyanezo@gmail.com</b>" +
    	"</p>" +
    	"</div>" +
    	"</div>";

  	await resend.emails.send({
    	from: process.env.EMAIL_FROM!,
    	to: current.cliente_email,
    	subject:
      	"🚚 Tu pedido #" + current.numero + " fue enviado - Volcán Proxies",
    	html,
  	});
	} catch (e) {
  	console.error("[TRACKING EMAIL] error:", e);
	}
  }

  return NextResponse.json({ pedido: data, confirmacion });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = supabaseAdmin();

  const { error } = await sb.from("pedidos").delete().eq("id", id);

  if (error) {
	console.error("[DELETE PEDIDO] error:", error);
	return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

