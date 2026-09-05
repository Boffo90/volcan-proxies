/**
 * El otro extremo de todos los correos de Supabase Auth.
 *
 * Confirmar una cuenta, recuperar una contraseña y cambiar de email mandan
 * al usuario a un enlace que termina acá con un `code` en la query. Ese código
 * hay que canjearlo por una sesión: mientras nadie lo canjee, la cuenta queda
 * creada pero sin confirmar y el login la rechaza.
 *
 * Esta ruta no existía. El registro llevaba meses mandando correos (cuando
 * el SMTP los dejaba salir) cuyo enlace no confirmaba nada.
 */

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/** A dónde se puede volver después de canjear. */
function destinoSeguro(next: string | null): string {
  // Solo rutas internas: un `next` absoluto convertiría este callback en un
  // redirector abierto hacia cualquier dominio.
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
	return "/mi-cuenta";
  }
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = destinoSeguro(url.searchParams.get("next"));

  // Supabase avisa de sus propios errores por query (enlace vencido, ya usado)
  // antes de que haya código que canjear.
  const errorUpstream =
	url.searchParams.get("error_description") || url.searchParams.get("error");
  if (errorUpstream) {
	return NextResponse.redirect(
  	new URL(`/login?error=${encodeURIComponent(errorUpstream)}`, url.origin)
	);
  }

  if (!code) {
	return NextResponse.redirect(new URL("/login?error=sin_codigo", url.origin));
  }

  const sb = await supabaseServer();
  const { error } = await sb.auth.exchangeCodeForSession(code);

  if (error) {
	// El caso más común no es un enlace roto: es abrir el correo en otro
	// navegador o dispositivo. El verificador de PKCE quedó en el navegador
	// donde se hizo el registro, así que acá no está y el canje falla.
	return NextResponse.redirect(
  	new URL("/login?error=canje_fallido", url.origin)
	);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
