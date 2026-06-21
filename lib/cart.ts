export type CartItem = {
  id: string;
  name: string;
  set: string;      	// ej: "cmr"
  set_name: string; 	// ej: "Commander Legends"
  collector_number: string; // ej: "197"
  image: string;
  finish: "glossy" | "matte";
  quantity: number;
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

export function clearCart() {
  setCart([]);
}

// Formato MTGO/Arena: "1 Lightning Bolt (M11) 149"
export function toMtgoFormat(items: CartItem[]): string {
  return items
	.map(
  	(it) =>
    	`${it.quantity} ${it.name} (${it.set.toUpperCase()}) ${it.collector_number}`
	)
	.join("\n");
}
	
