"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { getCart, removeFromCart, type CartItem } from "@/lib/cart";
import { calculateTotalWith, formatCLP } from "@/lib/pricing";
import { usePrecios } from "@/hooks/usePrecios";

export default function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { precios } = usePrecios();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
	setItems(getCart());
	const onUpdate = () => setItems(getCart());
	window.addEventListener("cart-updated", onUpdate);
	return () => window.removeEventListener("cart-updated", onUpdate);
  }, []);

  const { total, applied } = calculateTotalWith(
	precios,
	items.map((i) => ({ finish: i.finish, quantity: i.quantity }))
  );
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
	<>
  	<div
    	onClick={onClose}
    	className={
      	"fixed inset-0 bg-black/60 z-40 transition-opacity " +
      	(open ? "opacity-100" : "opacity-0 pointer-events-none")
    	}
  	/>
  	<aside
    	className={
      	"fixed top-0 right-0 h-full w-full md:w-96 bg-[#0F1115] z-50 border-l border-white/10 shadow-2xl transform transition-transform duration-300 flex flex-col " +
      	(open ? "translate-x-0" : "translate-x-full")
    	}
  	>
    	<div className="flex items-center justify-between p-4 border-b border-white/10">
      	<h2 className="font-bold text-lg flex items-center gap-2">
        	<ShoppingBag size={20} className="text-[#FF4D1A]" />
        	Carrito ({totalQty})
      	</h2>
      	<button onClick={onClose} className="hover:text-[#FF4D1A]">
        	<X size={22} />
      	</button>
    	</div>

    	<div className="flex-1 overflow-y-auto">
      	{items.length === 0 ? (
        	<p className="text-center text-gray-400 py-16 px-4">
          	Tu carrito está vacío
        	</p>
      	) : (
        	<div className="p-4 space-y-3">
          	{items.map((it, idx) => (
            	<div
              	key={it.id + "-" + it.finish + "-" + idx}
              	className="flex gap-3 bg-[#1E242B] p-3 rounded-lg border border-white/5"
            	>
              	<div
                	role="img"
                	aria-label={it.name}
                	className="w-12 h-16 rounded bg-[#0F1115] flex-shrink-0 bg-center bg-contain bg-no-repeat"
                	style={{ backgroundImage: `url(${it.image})` }}
              	/>
              	<div className="flex-1 min-w-0">
                	<p className="text-sm font-semibold truncate">{it.name}</p>
                	<p className="text-xs text-gray-400 truncate">
                  	{it.set_name}
                	</p>
                	<p className="text-xs text-[#FF4D1A] capitalize">
                  	{it.quantity}× {it.finish}
                	</p>
              	</div>
              	<button
                	onClick={() => removeFromCart(idx)}
                	className="text-red-400 hover:text-red-300 self-start"
              	>
                	<Trash2 size={16} />
              	</button>
            	</div>
          	))}
        	</div>
      	)}
    	</div>

    	{items.length > 0 && (
      	<div className="p-4 border-t border-white/10 bg-[#0F1115]">
        	<p className="text-xs text-[#FF4D1A] mb-1">{applied}</p>
        	<div className="flex justify-between items-center mb-3">
          	<span className="text-gray-400">Total</span>
          	<span className="text-xl font-bold text-[#FF4D1A]">
            	{formatCLP(total)}
          	</span>
        	</div>
        	<button
          	onClick={() => {
            	onClose();
            	router.push("/carrito");
          	}}
          	className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-sm mb-2"
        	>
          	Ver carrito completo
        	</button>
        	<button
          	onClick={() => {
            	onClose();
            	router.push("/checkout");
          	}}
          	className="w-full bg-[#FF4D1A] hover:bg-[#e64418] py-2.5 rounded-lg font-semibold"
        	>
          	Ir a pagar
        	</button>
      	</div>
    	)}
  	</aside>
	</>
  );
}

