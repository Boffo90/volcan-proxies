"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { getCart, setCart, mergeCart, type CartItem } from "@/lib/cart";

export default function AuthListener() {
  useEffect(() => {
	const sb = supabaseBrowser();

	const { data: listener } = sb.auth.onAuthStateChange(async (event) => {
  	if (event === "SIGNED_IN") {
    	try {
      	const res = await fetch("/api/cart");
      	if (!res.ok) return;
      	const { items: remote } = (await res.json()) as { items: CartItem[] };
      	const merged = mergeCart(remote, getCart());
      	setCart(merged);
      	await fetch("/api/cart", {
        	method: "PUT",
        	headers: { "Content-Type": "application/json" },
        	body: JSON.stringify({ items: merged }),
      	});
    	} catch {
      	// si falla la fusión, el carrito local sigue intacto
    	}
  	}
	});

	return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
