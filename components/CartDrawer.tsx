"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
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
	<AnimatePresence>
  	{open ? (
    	<>
      	<motion.div
        	onClick={onClose}
        	initial={{ opacity: 0 }}
        	animate={{ opacity: 1 }}
        	exit={{ opacity: 0 }}
        	className="fixed inset-0 bg-black/60 z-40"
      	/>
      	<motion.aside
        	initial={{ x: "100%" }}
        	animate={{ x: 0 }}
        	exit={{ x: "100%" }}
        	transition={{ type: "tween", duration: 0.25 }}
        	className="fixed top-0 right-0 h-full w-full md:w-96 bg-[#0b0d11]/95 backdrop-blur-xl z-50 border-l border-white/10 shadow-2xl flex flex-col"
      	>
        	<div className="flex items-center justify-between p-4 border-b border-white/10">
          	<h2 className="font-display font-bold text-lg flex items-center gap-2">
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
              	<AnimatePresence initial={false}>
                	{items.map((it, idx) => (
                  	<motion.div
                    	key={it.id + "-" + it.finish + "-" + idx}
                    	layout
                    	initial={{ opacity: 0, height: 0 }}
                    	animate={{ opacity: 1, height: "auto" }}
                    	exit={{ opacity: 0, height: 0 }}
                    	transition={{ duration: 0.2 }}
                    	className="flex gap-3 glass-card p-3 rounded-lg overflow-hidden"
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
                  	</motion.div>
                	))}
              	</AnimatePresence>
            	</div>
          	)}
        	</div>

        	{items.length > 0 && (
          	<div className="p-4 border-t border-white/10 bg-[#0b0d11]">
            	<p className="text-xs text-[#FF4D1A] mb-1">{applied}</p>
            	<div className="flex justify-between items-center mb-3">
              	<span className="text-gray-400">Total</span>
              	<span className="text-xl font-display font-bold text-lava">
                	{formatCLP(total)}
              	</span>
            	</div>
            	<button
              	onClick={() => {
                	onClose();
                	router.push("/carrito");
              	}}
              	className="w-full glass-card hover:border-[#FF4D1A]/40 py-2 rounded-lg text-sm mb-2 transition-colors"
            	>
              	Ver carrito completo
            	</button>
            	<button
              	onClick={() => {
                	onClose();
                	router.push("/checkout");
              	}}
              	className="w-full bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 py-2.5 rounded-lg font-semibold shadow-[0_4px_20px_-4px_rgba(255,79,26,0.6)] transition-all"
            	>
              	Ir a pagar
            	</button>
          	</div>
        	)}
      	</motion.aside>
    	</>
  	) : null}
	</AnimatePresence>
  );
}
