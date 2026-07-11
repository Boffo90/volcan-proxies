export type CartItem = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  image: string;
  finish: "glossy" | "matte";
  quantity: number;
  isCustom?: boolean;
  /** Identificador de MPCFill cuando el cliente eligió un arte HD de ahí. */
  mpcfillId?: string;
};

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
  const existing = cart.findIndex(
	(i) => i.id === item.id && i.finish === item.finish
  );
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

export function updateFinish(idx: number, finish: "glossy" | "matte") {
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
	const existing = merged.findIndex(
  	(i) => i.id === item.id && i.finish === item.finish
	);
	if (existing >= 0) merged[existing].quantity += item.quantity;
	else merged.push(item);
  }
  return merged;
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

