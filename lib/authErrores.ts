/**
 * Traduce los errores de Supabase Auth a algo que el cliente pueda usar.
 *
 * Antes se mostraba `error.message` tal cual. Eso dejaba dos problemas: los
 * mensajes salían en inglés, y cuando el error venía **sin mensaje** la
 * pantalla mostraba un `{}` — que es literalmente lo que le apareció a un
 * cliente al intentar registrarse. Un error que no dice nada es peor que
 * ninguno: el cliente no sabe si fue culpa suya, y nosotros no sabemos qué
 * pasó.
 *
 * La regla acá es que **siempre salga algo accionable**: o qué hacer, o a
 * quién escribirle. El detalle técnico va a la consola, no a la cara.
 */

/**
 * Deja el email como Supabase lo espera.
 *
 * Un cliente vio "Unable to validate email address: invalid format" con un
 * correo que a la vista estaba perfecto. La causa son caracteres invisibles:
 * el autocompletado del teléfono los mete al pegar, y **sobreviven a todo** —
 * el saneo de `<input type="email">` solo quita espacios ASCII, y `.trim()`
 * no toca los de ancho cero porque no son espacios.
 *
 * Como no se ven, el cliente no tiene forma de corregirlo: borra, reescribe,
 * y vuelve a pegar lo mismo. Por eso se limpia acá y no se le pide a él.
 */
export function normalizarEmail(v: string): string {
  return (
	v
  	// Ancho cero, juntadores y marca de orden de bytes. Van como escapes y
  	// no como los caracteres: en el archivo serian invisibles.
  	.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
  	// `trim` si se lleva el espacio duro (U+00A0), que es el otro habitual.
  	.trim()
  );
}

export type ErrorAuth = {
  /** Lo que se le muestra al cliente. */
  mensaje: string;
  /** Si tiene sentido ofrecerle reenviar el correo de confirmación. */
  sinConfirmar?: boolean;
  /** Si el problema es nuestro y no suyo. */
  nuestro?: boolean;
};

type Entrada = { message?: string; status?: number; code?: string } | null | undefined;

export function traducirErrorAuth(e: Entrada): ErrorAuth {
  // El detalle completo al log: es donde sirve, y no se pierde.
  console.error("[AUTH]", e);

  const msg = (e?.message ?? "").trim();
  const status = e?.status;
  const code = e?.code ?? "";
  const texto = `${msg} ${code}`.toLowerCase();

  if (/already registered|already exists|user_already_exists/.test(texto)) {
	return {
  	mensaje:
    	"Ya hay una cuenta con ese email. Inicia sesión, o recupera tu contraseña si no la recuerdas.",
	};
  }

  if (/not confirmed|email_not_confirmed/.test(texto)) {
	return {
  	mensaje:
    	"Tu cuenta todavía no está confirmada. Busca el correo que te mandamos, o pide uno nuevo acá abajo.",
  	sinConfirmar: true,
	};
  }

  if (/invalid login credentials/.test(texto)) {
	return { mensaje: "Email o contraseña incorrectos." };
  }

  if (/password/.test(texto) && /short|weak|least/.test(texto)) {
	return { mensaje: "La contraseña es muy corta: usa al menos 6 caracteres." };
  }

  if (/invalid format|validate email/.test(texto)) {
	return { mensaje: "Ese email no parece válido. Revísalo y prueba de nuevo." };
  }

  // Límite de envíos de Supabase. Es nuestro, no suyo, y se pasa solo.
  if (status === 429 || /rate limit|too many/.test(texto)) {
	return {
  	mensaje:
    	"Estamos recibiendo muchas solicitudes. Espera unos minutos y vuelve a intentar.",
  	nuestro: true,
	};
  }

  // El caso que dejaba un "{}": el correo de confirmación no pudo salir, o el
  // servidor contestó sin explicar. Para el cliente es lo mismo —no es culpa
  // suya y no lo puede arreglar— así que se le dice eso y a dónde escribir.
  if (status === 500 || /sending|smtp|unexpected_failure/.test(texto) || !msg) {
	return {
  	mensaje:
    	"No pudimos crear tu cuenta por un problema nuestro, no tuyo. Escríbenos a volcanproxies@gmail.com y te ayudamos — mientras tanto puedes comprar sin cuenta.",
  	nuestro: true,
	};
  }

  if (/fetch|network|failed to/.test(texto)) {
	return {
  	mensaje: "No pudimos conectarnos. Revisa tu conexión y prueba de nuevo.",
	};
  }

  return { mensaje: msg };
}
