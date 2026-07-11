"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, ShoppingBag, AlertCircle, Truck } from "lucide-react";
import NavBar from "@/components/NavBar";
import Reveal from "@/components/animation/Reveal";
import {
  getCart,
  removeFromCart,
  updateQty,
  updateFinish,
  type CartItem,
} from "@/lib/cart";
import {
  calculateTotalWith,
  finishDisponible,
  formatCLP,
  MIN_CARDS,
  SHIPPING_COST,
} from "@/lib/pricing";
import { usePrecios } from "@/hooks/usePrecios";
import FinishButtons from "@/components/FinishButtons";

export default function CarritoPage() {
  const router = useRouter();
  const { precios } = usePrecios();
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
	setItems(getCart());
	setMounted(true);
	const onUpdate = () => setItems(getCart());
	window.addEventListener("cart-updated", onUpdate);
	return () => window.removeEventListener("cart-updated", onUpdate);
  }, []);

  if (!mounted) {
	return (
  	<main className="min-h-screen bg-[#0b0d11] text-white">
    	<NavBar />
    	<div className="flex items-center justify-center py-32">
      	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
    	</div>
  	</main>
	);
  }

  const { total, applied } = calculateTotalWith(
	precios,
	items.map((i) => ({
  	finish: i.finish,
  	quantity: i.quantity,
  	isCustom: i.isCustom,
	}))
  );
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const faltan = Math.max(0, MIN_CARDS - totalQty);
  const cumpleMin = totalQty >= MIN_CARDS;
  const hayBloqueados = items.some(
	(i) => !finishDisponible(precios, i.finish)
  );

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	<div className="max-w-5xl mx-auto px-6 py-10">
    	<Reveal>
      	<h1 className="font-display font-extrabold text-3xl md:text-4xl mb-8">
        	Tu <span className="text-lava">carrito</span>
      	</h1>
    	</Reveal>

    	{items.length === 0 ? (
      	<Reveal className="text-center py-20">
        	<ShoppingBag className="mx-auto text-gray-500 mb-4" size={48} />
        	<p className="text-gray-400 mb-6">Tu carrito está vacío</p>
        	<button
          	onClick={() => router.push("/catalogo")}
          	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-6 py-3 rounded-lg font-semibold shadow-[0_4px_20px_-4px_rgba(255,79,26,0.5)] transition-all"
        	>
          	Ir al catálogo
        	</button>
      	</Reveal>
    	) : (
      	<Reveal className="grid lg:grid-cols-3 gap-8">
        	<div className="lg:col-span-2 space-y-4">
          	{items.map((it, idx) => {
            	const key = it.id + "-" + it.finish + "-" + idx;
            	return (
              	<div
                	key={key}
                	className="flex gap-4 glass-card p-4 rounded-xl"
              	>
                	<div
                  	role="img"
                  	aria-label={it.name}
                  	className="w-[60px] h-[84px] rounded bg-[#0b0d11] flex-shrink-0 bg-center bg-contain bg-no-repeat"
                  	style={{ backgroundImage: `url(${it.image})` }}
                	/>
                	<div className="flex-1">
                  	<p className="font-semibold">{it.name}</p>
                  	<p className="text-xs text-gray-400 uppercase">
                    	{it.set_name}
                  	</p>
                  	<div className="mt-2 max-w-[180px]">
                    	<FinishButtons
                      	precios={precios}
                      	value={it.finish}
                      	onChange={(f) => updateFinish(idx, f)}
                      	size="xs"
                    	/>
                    	{!finishDisponible(precios, it.finish) ? (
                      	<p className="text-[10px] text-red-400 mt-1">
                        	Este acabado no está disponible — cámbialo para
                        	poder pagar.
                      	</p>
                    	) : null}
                  	</div>
                  	<div className="flex items-center gap-3 mt-3">
                    	<label className="text-xs text-gray-400">Cant:</label>
                    	<input
                      	type="number"
                      	min={1}
                      	max={100}
                      	value={it.quantity}
                      	onChange={(e) =>
                        	updateQty(idx, Number(e.target.value) || 1)
                      	}
                      	className="w-20 bg-[#0b0d11] border border-white/10 rounded px-2 py-1 text-sm"
                    	/>
                    	<button
                      	onClick={() => removeFromCart(idx)}
                      	className="text-red-400 hover:text-red-300 ml-auto"
                      	title="Eliminar"
                    	>
                      	<Trash2 size={18} />
                    	</button>
                  	</div>
                	</div>
              	</div>
            	);
          	})}
        	</div>

        	<aside className="glass-card p-6 rounded-xl h-fit sticky top-24">
          	<h2 className="font-display font-bold text-lg mb-4">Resumen</h2>

          	<div className="flex justify-between text-sm mb-2">
            	<span className="text-gray-400">Cartas totales</span>
            	<span className={cumpleMin ? "" : "text-yellow-400"}>
              	{totalQty}
            	</span>
          	</div>
          	<div className="flex justify-between text-sm mb-4">
            	<span className="text-gray-400">Tarifa aplicada</span>
            	<span className="text-[#FF4D1A]">{applied}</span>
          	</div>

          	{!cumpleMin && (
            	<div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg mb-4 flex gap-2">
              	<AlertCircle
                	className="text-yellow-400 flex-shrink-0"
                	size={16}
              	/>
              	<div className="text-xs text-yellow-200">
                	<p className="font-semibold">
                  	Faltan {faltan} carta{faltan !== 1 ? "s" : ""} para el
                  	mínimo.
                	</p>
                	<p className="opacity-80 mt-1">
                  	Pedido mínimo: {MIN_CARDS} cartas (1 hoja completa).
                	</p>
              	</div>
            	</div>
          	)}

          	<div className="border-t border-white/10 pt-4 mb-4">
            	<div className="flex justify-between items-center">
              	<span className="text-gray-400">Subtotal cartas</span>
              	<span className="text-2xl font-display font-bold text-lava">
                	{formatCLP(total)}
              	</span>
            	</div>
          	</div>

          	<div className="bg-[#0b0d11] border border-white/10 rounded-lg p-3 mb-6 flex gap-2 text-xs text-gray-300">
            	<Truck
              	size={16}
              	className="text-[#FF4D1A] flex-shrink-0 mt-0.5"
            	/>
            	<div>
              	<p>
                	En el checkout puedes elegir{" "}
                	<b className="text-white">retiro en Pucón (gratis)</b> o
                	envío único de{" "}
                	<b className="text-white">{formatCLP(SHIPPING_COST)}</b> a
                	todo Chile.
              	</p>
            	</div>
          	</div>

          	<button
            	onClick={() => router.push("/checkout")}
            	disabled={!cumpleMin || hayBloqueados}
            	className="w-full bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 py-3 rounded-lg font-semibold shadow-[0_4px_20px_-4px_rgba(255,79,26,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          	>
            	{hayBloqueados
              	? "Hay acabados no disponibles"
              	: cumpleMin
              	? "Ir a pagar"
              	: `Faltan ${faltan} carta(s)`}
          	</button>
          	<p className="text-xs text-gray-500 text-center mt-4">
            	Flow.cl o transferencia
          	</p>
        	</aside>
      	</Reveal>
    	)}
  	</div>
	</main>
  );
}

