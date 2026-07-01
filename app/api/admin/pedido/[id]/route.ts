import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
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

  return NextResponse.json({ pedido: data });
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
  	"estado, historial, numero, cliente_nombre, cliente_email, direccion, comuna, region, total"
	)
	.eq("id", id)
	.single();

  const updates: Record<string, unknown> = {};
  let triggerTrackingEmail = false;

  if (body.estado && current && body.estado !== current.estado) {
	const newEntry = {
  	from: current.estado,
  	to: body.estado,
  	at: new Date().toISOString(),
	};

	const historial = Array.isArray(current.historial) ? current.historial : [];

	updates.estado = body.estado;
	updates.historial = [...historial, newEntry];
  }

  if (body.admin_notas !== undefined) {
	updates.admin_notas = body.admin_notas;
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

  const { data, error } = await sb
	.from("pedidos")
	.update(updates)
	.eq("id", id)
	.select()
	.single();

  if (error) {
	return NextResponse.json({ error: error.message }, { status: 500 });
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

  return NextResponse.json({ pedido: data });
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

