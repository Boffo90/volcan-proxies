/**
 * Donde Flow deja al cliente después de pagar.
 *
 * **Flow devuelve al cliente con un POST**, no con un GET. Durante meses la
 * `urlReturn` apuntó directo a `/gracias`, que es una página de Next y solo
 * responde GET: el cliente pagaba bien —el webhook de confirmación es otra
 * ruta y sí funcionaba— pero veía un **HTTP 405** en pantalla.
 *
 * El costo no fue cosmético. Al menos un cliente creyó que el pago había
 * fallado y volvió a pagar nueve minutos después: dos pedidos cobrados, una
 * devolución por transferencia y varios correos de ida y vuelta.
 *
 * Esta ruta acepta el POST y manda al navegador a `/gracias` con un **303**,
 * que es el código que obliga a rehacer la petición como GET. Con un 307 o un
 * 308 el navegador conservaría el POST y volveríamos al mismo 405.
 */

import { NextResponse } from "next/server";

function aGracias(req: Request): NextResponse {
  const url = new URL(req.url);
  const destino = new URL("/gracias", url.origin);

  // El número de pedido viaja en la query de la urlReturn que le dimos a Flow.
  const pedido = url.searchParams.get("pedido");
  if (pedido) destino.searchParams.set("pedido", pedido);
  destino.searchParams.set("metodo", "flow");

  // 303 y no 307/308: el POST tiene que convertirse en GET.
  return NextResponse.redirect(destino, 303);
}

export async function POST(req: Request) {
  return aGracias(req);
}

// Por si Flow cambia de método, o alguien llega a la URL pegándola a mano.
export async function GET(req: Request) {
  return aGracias(req);
}
