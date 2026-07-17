"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { getCart, setCart, mergeCart, type CartItem } from "@/lib/cart";

// Marca qué usuario ya fusionó su carrito de invitado en este navegador.
const SYNCED_KEY = "cart_synced_user";

export default function AuthListener() {
  useEffect(() => {
	const sb = supabaseBrowser();

	const { data: listener } = sb.auth.onAuthStateChange(async (event, session) => {
  	const userId = session?.user?.id ?? null;

  	if (!userId) {
    	// Al cerrar sesión permitimos que el próximo login vuelva a fusionar.
    	if (event === "SIGNED_OUT") localStorage.removeItem(SYNCED_KEY);
    	return;
  	}

  	// onAuthStateChange emite SIGNED_IN / INITIAL_SESSION / TOKEN_REFRESHED
  	// en cada carga de página, recarga y refresco de token — no solo al
  	// iniciar sesión. La fusión con mergeCart SUMA cantidades, así que si se
  	// repite duplica el carrito en cada evento (2→4→8→16→32...). Por eso solo
  	// fusionamos una vez por usuario; los eventos siguientes se ignoran.
  	if (localStorage.getItem(SYNCED_KEY) === userId) return;

  	try {
    	const res = await fetch("/api/cart");
    	if (!res.ok) return;
    	const { items: remote } = (await res.json()) as { items: CartItem[] };
    	const merged = mergeCart(remote, getCart());
    	setCart(merged);
    	// Marcar como sincronizado antes del PUT evita que un evento
    	// concurrente vuelva a fusionar mientras la escritura está en curso.
    	localStorage.setItem(SYNCED_KEY, userId);
    	await fetch("/api/cart", {
      	method: "PUT",
      	headers: { "Content-Type": "application/json" },
      	body: JSON.stringify({ items: merged }),
    	});
  	} catch {
    	// si falla la fusión, el carrito local sigue intacto
  	}
	});

	return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
