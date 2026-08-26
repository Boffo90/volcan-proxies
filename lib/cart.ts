import type { Finish } from "./pricing";

export type CartItem = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  image: string;
  finish: Finish;
  quantity: number;
  isCustom?: boolean;
  /** Identificador de MPCFill cuando el cliente eligió un arte HD de ahí. */
  mpcfillId?: string;
  /**
  * Imagen del dorso personalizado, si el cliente pidió uno. Vacío significa el
  * reverso normal: blanco liso en las de una cara, y su reverso real en las
  * MDFC, que no pagan extra porque ese reverso ya viene con la carta.
  */
  dorsoUrl?: string;
  /** Nombre del archivo del dorso, para reconocerlo en el carrito y al producir. */
  dorsoNombre?: string;
};

/**
* Dos líneas son la misma solo si coinciden carta, acabado Y dorso: la misma
* carta con dorso custom y sin él son dos cosas distintas de producir.
*/
function mismaLinea(a: CartItem, b: CartItem): boolean {
  return (
	a.id === b.id && a.finish === b.finish && (a.dorsoUrl ?? "") === (b.dorsoUrl ?? "")
  );
}

const KEY = "cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
	return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
	return [];
  }
}

export function setCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const existing = cart.findIndex((i) => mismaLinea(i, item));
  if (existing >= 0) cart[existing].quantity += item.quantity;
  else cart.push(item);
  setCart(cart);
}

export function removeFromCart(idx: number) {
  const cart = getCart();
  cart.splice(idx, 1);
  setCart(cart);
}

export function updateQty(idx: number, qty: number) {
  const cart = getCart();
  if (cart[idx]) cart[idx].quantity = Math.max(1, qty);
  setCart(cart);
}

export function updateFinish(idx: number, finish: Finish) {
  const cart = getCart();
  if (cart[idx]) cart[idx].finish = finish;
  setCart(cart);
}

export function clearCart() {
  setCart([]);
}

export function mergeCart(a: CartItem[], b: CartItem[]): CartItem[] {
  const merged = [...a];
  for (const item of b) {
	const existing = merged.findIndex((i) => mismaLinea(i, item));
	if (existing >= 0) merged[existing].quantity += item.quantity;
	else merged.push(item);
  }
  return merged;
}

/**
* Aplica un dorso personalizado a todo el pedido. Es el caso real: quien pide
* dorso custom lo quiere para el mazo entero, y hacerlo carta por carta serían
* cien clics. El cargo por diseño se paga una sola vez igual.
*/
export function setDorsoTodos(dorsoUrl: string, dorsoNombre: string) {
  setCart(getCart().map((i) => ({ ...i, dorsoUrl, dorsoNombre })));
}

export function quitarDorsoTodos() {
  setCart(
	getCart().map((i) => ({ ...i, dorsoUrl: undefined, dorsoNombre: undefined }))
  );
}

/** El dorso que lleva el pedido, si todas las cartas comparten uno. */
export function dorsoDelPedido(
  items: CartItem[]
): { url: string; nombre: string } | null {
  const conDorso = items.filter((i) => i.dorsoUrl);
  if (conDorso.length === 0) return null;
  return {
	url: conDorso[0].dorsoUrl!,
	nombre: conDorso[0].dorsoNombre || "Dorso personalizado",
  };
}

/** Lo que necesita el cálculo de precio de cada línea del carrito. */
export function toCalcItems(items: CartItem[]) {
  return items.map((i) => ({
	id: i.id,
	finish: i.finish,
	quantity: i.quantity,
	isCustom: i.isCustom,
	dorsoUrl: i.dorsoUrl,
  }));
}

export function toMtgoFormat(items: CartItem[]): string {
  return items
	.map((it) => {
  	if (it.isCustom) {
    	return `${it.quantity} [CUSTOM] ${it.name}`;
  	}
  	return `${it.quantity} ${it.name} (${it.set.toUpperCase()}) ${it.collector_number}`;
	})
	.join("\n");
}

