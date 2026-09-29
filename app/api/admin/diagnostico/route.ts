/**
 * Diagnóstico de la configuración del entorno.
 *
 * Nace de una pregunta que costó tres días contestar: ¿está `EMAIL_FROM` bien
 * puesta en producción? Vercel no muestra de vuelta el valor guardado, así que
 * la pantalla de variables no sirve para saberlo, y el código fallaba de una
 * forma que tampoco lo decía. La respuesta estaba repartida entre tres paneles
 * de tres servicios distintos.
 *
 * **Acá no sale ni un valor.** Solo si está, si tiene la forma correcta y qué
 * anda mal. La ruta vive bajo `/api/admin`, o sea detrás de la contraseña, pero
 * eso no es razón para devolver secretos: una llave filtrada en una respuesta
 * JSON queda en el historial del navegador y en cualquier proxy del camino.
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/** Cómo salió una comprobación. */
type Veredicto = "ok" | "aviso" | "error";

type Chequeo = {
  nombre: string;
  veredicto: Veredicto;
  detalle: string;
  /** Para qué sirve, en castellano, para no tener que ir al código. */
  paraQue: string;
};

/** El dominio de un correo, que no es secreto y es justo lo que importa. */
function dominioDe(valor: string): string | null {
  const m = valor.match(/<?([^<>\s]+@[^<>\s]+)>?\s*$/);
  return m ? m[1].split("@")[1] ?? null : null;
}

/** `volcanproxies@gmail.com` → `v•••@gmail.com`. */
function tapar(valor: string): string {
  const m = valor.match(/<?([^<>\s]+)@([^<>\s]+)>?\s*$/);
  if (!m) return "•••";
  return `${m[1].slice(0, 1)}•••@${m[2]}`;
}

function chequearEmailFrom(): Chequeo {
  const paraQue = "El remitente de todos los correos de pedido.";
  const v = (process.env.EMAIL_FROM ?? "").trim();
  if (!v) {
	return {
  	nombre: "EMAIL_FROM",
  	veredicto: "error",
  	detalle:
    	"Vacía o sin definir. Ningún correo de pedido puede salir: ni " +
    	"confirmación, ni pago, ni tracking.",
  	paraQue,
	};
  }
  const dominio = dominioDe(v);
  if (!dominio) {
	return {
  	nombre: "EMAIL_FROM",
  	veredicto: "error",
  	detalle:
    	'No parece una dirección. Se espera algo como "Volcán Proxies ' +
    	'<no-reply@volcanproxies.cl>".',
  	paraQue,
	};
  }
  if (dominio.endsWith("resend.dev")) {
	return {
  	nombre: "EMAIL_FROM",
  	veredicto: "error",
  	detalle:
    	"Apunta a resend.dev, la dirección de prueba: solo entrega a la " +
    	"casilla dueña de la cuenta de Resend. Tú recibes los correos y " +
    	"ningún cliente los recibe.",
  	paraQue,
	};
  }
  return {
	nombre: "EMAIL_FROM",
	veredicto: "ok",
	detalle: `Definida, enviando desde @${dominio}. Más abajo se comprueba si ese dominio está verificado en Resend.`,
	paraQue,
  };
}

function chequearEmailAdmin(): Chequeo {
  const paraQue = "A dónde llega el aviso de pedido nuevo.";
  const v = (process.env.EMAIL_ADMIN ?? "").trim();
  if (!v) {
	return {
  	nombre: "EMAIL_ADMIN",
  	veredicto: "error",
  	detalle: "Vacía o sin definir. No te llega aviso de ningún pedido nuevo.",
  	paraQue,
	};
  }
  if (!v.includes("@")) {
	return {
  	nombre: "EMAIL_ADMIN",
  	veredicto: "error",
  	detalle: "No parece una dirección de correo.",
  	paraQue,
	};
  }
  return {
	nombre: "EMAIL_ADMIN",
	veredicto: "ok",
	detalle: `Los avisos van a ${tapar(v)}.`,
	paraQue,
  };
}

function chequearSimple(
  nombre: string,
  paraQue: string,
  opciones: { prefijo?: string; largoMinimo?: number; siFalta: string }
): Chequeo {
  const v = (process.env[nombre] ?? "").trim();
  if (!v) {
	return { nombre, veredicto: "error", detalle: opciones.siFalta, paraQue };
  }
  if (opciones.prefijo && !v.startsWith(opciones.prefijo)) {
	return {
  	nombre,
  	veredicto: "aviso",
  	detalle: `Definida, pero no empieza con "${opciones.prefijo}" como se espera. Puede estar pegada a medias o ser de otro servicio.`,
  	paraQue,
	};
  }
  if (opciones.largoMinimo && v.length < opciones.largoMinimo) {
	return {
  	nombre,
  	veredicto: "aviso",
  	detalle: `Definida pero muy corta (${v.length} caracteres). Suele ser un pegado incompleto.`,
  	paraQue,
	};
  }
  return { nombre, veredicto: "ok", detalle: "Definida y con la forma esperada.", paraQue };
}

/**
 * Le pregunta a Resend por sus dominios.
 *
 * Es la única comprobación que sale a internet, y la única que responde lo que
 * de verdad importa: si la llave sirve y si el dominio del remitente está
 * verificado. Sin esto el diagnóstico solo diría "la variable está puesta",
 * que es justo lo que ya sabíamos.
 */
async function chequearResend(): Promise<{
  veredicto: Veredicto;
  detalle: string;
  dominios: { nombre: string; estado: string }[];
}> {
  const llave = (process.env.RESEND_API_KEY ?? "").trim();
  if (!llave) {
	return {
  	veredicto: "error",
  	detalle: "Sin RESEND_API_KEY no se puede preguntar.",
  	dominios: [],
	};
  }
  try {
	const res = await fetch("https://api.resend.com/domains", {
  	headers: { Authorization: `Bearer ${llave}` },
  	signal: AbortSignal.timeout(8000),
  	cache: "no-store",
	});
	if (!res.ok) {
  	// Una llave mala NO devuelve 401: Resend contesta 400 con
  	// "API key is invalid", y 401 lo reserva para cuando no mandas ninguna.
  	// Mirando solo el código, el caso más probable quedaba como un genérico
  	// "no se pudo comprobar", que es justo lo que este panel viene a evitar.
  	const cuerpo = (await res.json().catch(() => null)) as {
    	message?: string;
  	} | null;
  	const mensaje = cuerpo?.message ?? "";
  	const llaveMala =
    	res.status === 401 || res.status === 403 || /api key/i.test(mensaje);
  	return {
    	veredicto: llaveMala ? "error" : "aviso",
    	detalle: llaveMala
      	? `Resend no acepta la llave: "${mensaje || res.status}". Está mal pegada, vencida o revocada. Ningún correo puede salir.`
      	: `Resend respondió ${res.status}${mensaje ? `: "${mensaje}"` : ""}. No se pudo comprobar el dominio.`,
    	dominios: [],
  	};
	}
	const cuerpo = (await res.json()) as {
  	data?: { name?: string; status?: string }[];
	};
	const dominios = (cuerpo.data ?? []).map((d) => ({
  	nombre: d.name ?? "?",
  	estado: d.status ?? "?",
	}));

	const delRemitente = dominioDe((process.env.EMAIL_FROM ?? "").trim());
	const calza = dominios.find((d) => d.nombre === delRemitente);

	if (!delRemitente) {
  	return {
    	veredicto: "aviso",
    	detalle: "La llave sirve, pero sin EMAIL_FROM no hay dominio que comprobar.",
    	dominios,
  	};
	}
	if (!calza) {
  	return {
    	veredicto: "error",
    	detalle: `La llave sirve, pero "${delRemitente}" no está entre los dominios de esta cuenta de Resend. Los envíos van a fallar con un 550.`,
    	dominios,
  	};
	}
	if (calza.estado !== "verified") {
  	return {
    	veredicto: "error",
    	detalle: `"${delRemitente}" está en la cuenta pero su estado es "${calza.estado}", no "verified". Hasta que lo esté, Resend rechaza los envíos.`,
    	dominios,
  	};
	}
	return {
  	veredicto: "ok",
  	detalle: `La llave sirve y "${delRemitente}" está verificado.`,
  	dominios,
	};
  } catch (e) {
	const motivo = e instanceof Error ? e.message : String(e);
	return {
  	veredicto: "aviso",
  	detalle: `No se pudo hablar con Resend: ${motivo}`,
  	dominios: [],
	};
  }
}

/**
 * Busca en los pedidos las notas de envío fallido.
 *
 * Es la parte que contesta "¿desde cuándo?", que es la pregunta que sigue a
 * "¿está roto?" y la que decide a qué clientes hay que escribirles a mano.
 */
async function chequearPedidos() {
  try {
	const sb = supabaseAdmin();
	const { data, error } = await sb
  	.from("pedidos")
  	.select("numero, created_at, admin_notas")
  	.like("admin_notas", "%No se pudo enviar%")
  	.order("created_at", { ascending: false })
  	.limit(20);
	if (error) return { disponible: false as const, motivo: error.message };
	return {
  	disponible: true as const,
  	total: data?.length ?? 0,
  	pedidos: (data ?? []).map((p) => ({
    	numero: p.numero as number,
    	fecha: p.created_at as string,
    	nota: (p.admin_notas as string) ?? "",
  	})),
	};
  } catch (e) {
	return {
  	disponible: false as const,
  	motivo: e instanceof Error ? e.message : String(e),
	};
  }
}

export async function GET() {
  const variables: Chequeo[] = [
	chequearEmailFrom(),
	chequearEmailAdmin(),
	chequearSimple("RESEND_API_KEY", "La llave para enviar correos.", {
  	prefijo: "re_",
  	siFalta: "Vacía o sin definir. No sale ningún correo.",
	}),
	chequearSimple(
  	"NEXT_PUBLIC_SUPABASE_URL",
  	"La base de datos: pedidos, precios, stock.",
  	{ prefijo: "https://", siFalta: "Vacía o sin definir. El sitio no funciona." }
	),
	chequearSimple("SUPABASE_SERVICE_ROLE_KEY", "Escribir en la base desde el servidor.", {
  	largoMinimo: 40,
  	siFalta: "Vacía o sin definir. No se pueden crear pedidos.",
	}),
	chequearSimple("FLOW_API_KEY", "Cobrar con tarjeta.", {
  	siFalta: "Vacía o sin definir. El pago con Flow no funciona.",
	}),
	chequearSimple("FLOW_API_URL", "Sandbox o producción de Flow.", {
  	prefijo: "https://",
  	siFalta: "Vacía o sin definir.",
	}),
	chequearSimple("APITCG_KEY", "El catálogo de Mitos y Leyendas.", {
  	siFalta: "Vacía o sin definir. Ese catálogo aparece vacío.",
	}),
	chequearSimple("ADMIN_PASSWORD", "La contraseña de este panel.", {
  	largoMinimo: 8,
  	siFalta: "Vacía o sin definir. El panel queda inaccesible.",
	}),
  ];

  // El sandbox no es un error, pero verlo en producción sí es una sorpresa que
  // conviene tener a la vista antes de preguntarse por qué no llega la plata.
  const flowUrl = (process.env.FLOW_API_URL ?? "").trim();
  const flowSandbox = flowUrl.includes("sandbox");

  const [resend, pedidos] = await Promise.all([
	chequearResend(),
	chequearPedidos(),
  ]);

  return NextResponse.json(
	{ variables, resend, pedidos, flowSandbox, entorno: process.env.VERCEL_ENV ?? "local" },
	{ headers: { "Cache-Control": "no-store" } }
  );
}
