/**
 * Contrato común de los catálogos de cartas.
 *
 * Cada juego trae su API con forma propia (Scryfall devuelve `oracle_text`,
 * YGOPRODeck devuelve `desc`, TCGdex ni siquiera trae el set en el resultado
 * de búsqueda). Este archivo define la única forma que ve el resto del sitio:
 * un catálogo se implementa una vez, se registra en `index.ts`, y las páginas
 * no se enteran de qué juego están mostrando.
 *
 * Es la misma idea que usa Cardwright en `sources.py`: un módulo por juego,
 * todos con la misma interfaz, y un registro que los lista.
 */

import type { IdiomaId } from "./idiomas";

/** Un juego con catálogo propio. Agregar uno acá obliga a completar el resto. */
export type JuegoId = "mtg" | "ygo" | "rift" | "pkmn";

export type ImagenesCarta = {
  /** Miniatura de grilla. */
  small: string;
  /** Tamaño intermedio, para la ficha y el carrito. */
  normal: string;
  /** La grande del detalle. */
  large: string;
  /**
   * La que se imprime: la mejor que publique el catálogo.
   *
   * Va aparte de `large` porque no son lo mismo. `large` es lo que se ve
   * bien en pantalla; esta es la que se manda a Cardwright, y ahí un
   * miniatura no se nota hasta que la carta sale impresa y borrosa.
   */
  print: string;
};

/**
 * Una fila de la ficha. El catálogo decide qué mostrar porque es el único que
 * sabe qué significa cada campo de su juego: "P/R" en Magic y "ATK/DEF" en
 * Yu-Gi-Oh son la misma fila para la página, y ninguna de las dos tiene por
 * qué estar escrita en la página.
 */
export type CampoFicha = {
  label: string;
  value: string;
  /** "mana" pinta los símbolos de maná; cualquier otra cosa es texto plano. */
  render?: "mana" | "texto";
};

export type CartaCatalogo = {
  /**
   * Identificador único entre juegos: "mtg:<id nativo>".
   *
   * Es lo que viaja al carrito y queda guardado en el pedido, así que no puede
   * chocar entre catálogos: dos juegos distintos pueden usar el mismo número.
   */
  uid: string;
  juego: JuegoId;
  /** El id dentro de su propio catálogo, que es lo que la API entiende. */
  nativoId: string;
  name: string;
  /**
   * Agrupa todas las versiones de la misma carta, para el selector de arte.
   * En Magic es el `oracle_id` (una carta, muchas impresiones).
   */
  grupoId: string;
  /** Código corto del set, el que va en la decklist de Cardwright. */
  set: string;
  set_name: string;
  collector_number: string;
  rarity?: string;
  artist?: string;
  /**
   * El idioma en que llegó esta carta.
   *
   * No es el que se pidió: es el que la fuente entregó. Si se buscaba en
   * español y solo existe en inglés, acá dice "en", y así el cliente ve la
   * carta que va a recibir en vez de una promesa.
   */
  idioma: IdiomaId;
  /**
   * La ilustración es más ancha que alta.
   *
   * Los campos de batalla de Riftbound vienen a 1039×744, y metidos en el
   * marco vertical del resto del catálogo se recortan hasta no verse. El
   * cartón impreso sí es vertical — la carta se sostiene de lado — pero al
   * cliente hay que mostrarle la imagen como es.
   */
  apaisada?: boolean;
  imagenes: ImagenesCarta;
  /** Las filas de datos de la ficha, ya armadas por el catálogo. */
  ficha: CampoFicha[];
  /** El texto de reglas, aparte porque va en su propio bloque destacado. */
  texto?: CampoFicha;
};

export type Ruling = { fecha: string; texto: string };

export type ResultadoBusqueda = {
  cartas: CartaCatalogo[];
  /** Cuántas encontró la API, que suele ser más de lo que devuelve. */
  total: number;
};

export type Catalogo = {
  id: JuegoId;
  /** Nombre completo, para títulos. */
  nombre: string;
  /** Etiqueta corta, para el selector y los chips. */
  corto: string;
  /**
   * Tamaño físico de la carta, con el mismo texto que usa `lib/formulas.ts`:
   * es lo que enlaza el catálogo con la receta de producción, para no tener
   * dos verdades sobre cuánto mide una carta de este juego.
   */
  tamano: string;
  /** Ejemplo dentro del buscador. */
  placeholder: string;
  /** Ayuda bajo el buscador (operadores propios del catálogo, si tiene). */
  ayuda?: string;
  /**
   * Lo que hay que decirle al cliente antes de que compre, aunque no venda.
   * Misma idea que la "contra" de cada acabado: si el arte de un juego viene
   * a menor resolución, se dice, porque es lo que hace creíble el resto.
   */
  aviso?: string;
  /** Artes HD de MPCFill. Hoy solo tiene sentido en Magic. */
  soportaMpcfill: boolean;
  /**
   * Los idiomas en que esta fuente entrega la carta de verdad.
   *
   * Medido contra cada API, no copiado de su documentación: ver `idiomas.ts`.
   * El inglés está siempre, y es a lo que se cae cuando el idioma pedido no
   * existe para esa carta.
   */
  idiomas: IdiomaId[];

  buscar(q: string, idioma: IdiomaId): Promise<ResultadoBusqueda>;
  /** El idioma viaja dentro del id, así que acá no se pasa. */
  porId(nativoId: string): Promise<CartaCatalogo | null>;
  /**
   * Muchas cartas de una vez.
   *
   * Lo implementa quien tenga cómo hacerlo en pocas llamadas. Sin esto, armar
   * el archivo de un pedido de 375 cartas eran 375 consultas en paralelo y la
   * fuente nos cortaba: volvían 374 sin resolver y se habrían impreso desde la
   * miniatura. Quien no lo implemente se resuelve de a poco, ver
   * `/api/admin/pedido/[id]/cardwright`.
   */
  porIds?(nativoIds: string[]): Promise<CartaCatalogo[]>;
  /** Las otras versiones de la misma carta, para el selector de arte. */
  versiones(carta: CartaCatalogo): Promise<CartaCatalogo[]>;
  aleatorias(n: number, idioma: IdiomaId): Promise<CartaCatalogo[]>;
  autocompletar(q: string, idioma: IdiomaId): Promise<string[]>;
  /** Solo Magic publica rulings; el resto no implementa esto. */
  rulings?(carta: CartaCatalogo): Promise<Ruling[]>;
};

const SEP = ":";

export function armarUid(juego: JuegoId, nativoId: string): string {
  return `${juego}${SEP}${nativoId}`;
}

/**
 * Parte un uid en juego + id nativo.
 *
 * Un id sin prefijo se lee como Magic a propósito: los carritos guardados en
 * el navegador y los pedidos ya en la base traen ids de Scryfall pelados, de
 * cuando el sitio era solo MTG. Sin esto, un carrito viejo deja de resolver.
 */
export function parseUid(uid: string): { juego: JuegoId; nativoId: string } {
  const corte = uid.indexOf(SEP);
  if (corte > 0) {
    const posible = uid.slice(0, corte);
    if (esJuego(posible)) {
      return { juego: posible, nativoId: uid.slice(corte + 1) };
    }
  }
  return { juego: "mtg", nativoId: uid };
}

const JUEGOS: readonly string[] = ["mtg", "ygo", "rift", "pkmn"] satisfies readonly JuegoId[];

export function esJuego(v: string): v is JuegoId {
  return JUEGOS.includes(v);
}
