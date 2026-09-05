/**
 * El pedido, en el formato de lista de cartas que importa Cardwright.
 *
 * Es el puente que faltaba. Hasta acá, cada fuente entraba por su propia
 * puerta: decklist para Scryfall, XML para MPCFill, y a mano para todo lo
 * demás — que es todo Yu-Gi-Oh, todo Pokémon y todas las customs. Un archivo
 * con la URL de la imagen de cada carta entra de una sola vez y sirve para
 * cualquier juego, incluidos los que Cardwright ni siquiera tiene.
 *
 * Lo importante que hace: **resuelve la imagen de impresión**. Lo que guarda
 * el pedido es la miniatura que vio el cliente (146 px de ancho en Magic), y
 * mandar eso a imprimir sale borroso. Acá cada carta se vuelve a resolver
 * contra su catálogo para sacar la buena.
 */

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { catalogo, parseUid, type JuegoId } from "@/lib/catalogo";
import { FINISH_INFO, type Finish } from "@/lib/pricing";

type PedidoItem = {
  id: string;
  juego?: string;
  name: string;
  set?: string;
  collector_number?: string;
  image?: string;
  finish: string;
  quantity: number;
  isCustom?: boolean;
  mpcfillId?: string;
  dorsoUrl?: string;
};

/** Cómo se llama el juego dentro de Cardwright. */
const JUEGO_CARDWRIGHT: Record<JuegoId, string> = {
  mtg: "scryfall",
  ygo: "ygo",
  rift: "riftbound",
  pkmn: "pokemon",
  // Cardwright no tiene catálogo de Mitos y Leyendas, así que no hay id que
  // darle: la lista igual sirve, solo que sin dorso ni tamaño automáticos.
  myl: "",
};

/**
 * Una URL absoluta, porque el archivo lo lee otro programa.
 *
 * Las imágenes que pasan por nuestro proxy quedan guardadas como ruta
 * relativa, que dentro del navegador funciona y fuera no significa nada.
 */
function absoluta(url: string, origen: string): string {
  if (!url) return "";
  return url.startsWith("/") ? origen + url : url;
}

function etiquetaAcabado(finish: string): string {
  return FINISH_INFO[finish as Finish]?.label ?? finish;
}

/**
 * Cuántas se piden a la vez cuando hay que ir de a una.
 *
 * Scryfall pide 50-100 ms entre peticiones y el resto de las fuentes son
 * proyectos chicos. Un pedido grande disparado entero en paralelo es lo que
 * hace que te corten.
 */
const A_LA_VEZ = 8;

/**
 * La imagen de impresión de cada uid.
 *
 * Agrupadas por juego, y en una sola llamada donde el catálogo sabe hacerlo.
 * Sin esto, un pedido de 375 cartas eran 375 consultas simultáneas: Scryfall
 * cortaba y volvían 374 sin resolver, o sea 374 cartas que se habrían impreso
 * desde la miniatura que vio el cliente.
 *
 * Lo que no se pueda resolver se queda fuera del mapa a propósito: quien llama
 * lo reporta en `sinResolver` y el panel lo muestra.
 */
async function resolverImagenes(uids: string[], destino: Map<string, string>) {
  const porJuego = new Map<JuegoId, string[]>();
  for (const uid of uids) {
    const { juego } = parseUid(uid);
    const lista = porJuego.get(juego) ?? [];
    lista.push(uid);
    porJuego.set(juego, lista);
  }

  for (const [juego, delJuego] of porJuego) {
    const cat = catalogo(juego);
    // El uid TAL COMO lo guarda el pedido, buscado por su id nativo.
    //
    // No se puede reconstruir: los pedidos anteriores a los uid con prefijo
    // guardan el id de Scryfall pelado, así que armar "mtg:<id>" desde la
    // carta resuelta no calza con lo que hay en la base y todas quedan sin
    // resolver. Pasó de verdad con un pedido real.
    const uidPorNativo = new Map(
      delJuego.map((uid) => [parseUid(uid).nativoId, uid])
    );
    try {
      if (cat.porIds) {
        const cartas = await cat.porIds([...uidPorNativo.keys()]);
        // El orden de la respuesta no tiene por qué coincidir con el de la
        // consulta, y las que no existan simplemente no vuelven.
        for (const c of cartas) {
          const uid = uidPorNativo.get(c.nativoId);
          if (uid) destino.set(uid, c.imagenes.print);
        }
        continue;
      }
      // Sin consulta masiva: de a poco, para no gatillar el corte.
      for (let i = 0; i < delJuego.length; i += A_LA_VEZ) {
        await Promise.all(
          delJuego.slice(i, i + A_LA_VEZ).map(async (uid) => {
            try {
              const carta = await cat.porId(parseUid(uid).nativoId);
              if (carta) destino.set(uid, carta.imagenes.print);
            } catch {
              // Una carta que falla no bota al resto.
            }
          })
        );
      }
    } catch {
      // Un catálogo caído no bota el archivo entero.
    }
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
	return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = supabaseAdmin();
  const { data: pedido, error } = await sb
	.from("pedidos")
	.select("numero, items")
	.eq("id", id)
	.single();

  if (error || !pedido) {
	return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const origen = new URL(req.url).origin;
  const items = (pedido.items || []) as PedidoItem[];

  /**
  * Las cartas de catálogo se resuelven una sola vez por uid: un mazo repite
  * la misma carta en varios acabados, y no tiene sentido preguntarle al
  * catálogo dos veces por la misma imagen.
  */
  const uids = [
	...new Set(
  	items
    	.filter((it) => !it.isCustom && !it.mpcfillId)
    	.map((it) => it.id)
	),
  ];
  const impresion = new Map<string, string>();
  await resolverImagenes(uids, impresion);

  const cartas = [];
  const sinResolver: string[] = [];

  for (const it of items) {
	// Prioridad: la imagen de impresión recién resuelta, después el arte HD
	// de MPCFill por su id de Drive, y al final lo que guarde el pedido —
	// que es lo correcto para una custom, porque ahí la imagen del cliente
	// ES la de impresión.
	const drive = it.mpcfillId
  	? `https://drive.google.com/uc?id=${it.mpcfillId}&export=download`
  	: "";
	const imagen = impresion.get(it.id) || drive || it.image || "";
	if (!imagen) continue;
	if (!it.isCustom && !drive && !impresion.has(it.id)) {
  	sinResolver.push(it.name);
	}

	const juego: JuegoId = (it.juego as JuegoId) || parseUid(it.id).juego;
	cartas.push({
  	name: it.name,
  	quantity: it.quantity,
  	image: absoluta(imagen, origen),
  	// MPCFill lleva borde a sangre y Cardwright lo recorta solo, pero solo
  	// si sabe que viene de ahí.
  	game: it.mpcfillId ? "mpc" : JUEGO_CARDWRIGHT[juego],
  	...(it.dorsoUrl ? { back: absoluta(it.dorsoUrl, origen) } : {}),
  	note: etiquetaAcabado(it.finish),
	});
  }

  return NextResponse.json({
	lista: {
  	format: "cardwright-list",
  	version: 1,
  	name: `Pedido ${pedido.numero}`,
  	cards: cartas,
	},
	// El panel lo muestra: una carta que no se pudo resolver se va a imprimir
	// desde la miniatura, y eso hay que verlo antes y no después.
	sinResolver,
  });
}
