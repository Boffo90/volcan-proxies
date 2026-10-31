"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Loader2,
  ShoppingBag,
  AlertCircle,
  Truck,
  Upload,
  X,
} from "lucide-react";
import NavBar from "@/components/NavBar";
import Reveal from "@/components/animation/Reveal";
import {
  getCart,
  removeFromCart,
  updateQty,
  updateFinish,
  setDorsoTodos,
  quitarDorsoTodos,
  dorsoDelPedido,
  toCalcItems,
  type CartItem,
} from "@/lib/cart";
import { uploadImage } from "@/lib/imageUpload";
import {
  calculateTotalWith,
  FINISH_INFO,
  finishDisponible,
  formatCLP,
  MIN_CARDS,
  SHIPPING_COST,
  sugerenciaPromo,
} from "@/lib/pricing";
import { usePrecios } from "@/hooks/usePrecios";
import FinishButtons from "@/components/FinishButtons";

export default function CarritoPage() {
  const router = useRouter();
  const { precios } = usePrecios();
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const dorsoInputRef = useRef<HTMLInputElement>(null);
  const [subiendoDorso, setSubiendoDorso] = useState(false);
  const [errorDorso, setErrorDorso] = useState("");

  useEffect(() => {
	setItems(getCart());
	setMounted(true);
	const onUpdate = () => setItems(getCart());
	window.addEventListener("cart-updated", onUpdate);
	return () => window.removeEventListener("cart-updated", onUpdate);
  }, []);

  if (!mounted) {
	return (
  	<main className="min-h-screen bg-surface text-ink-soft">
    	<NavBar />
    	<div className="flex items-center justify-center py-32">
      	<Loader2 className="animate-spin text-flame-ink" size={32} />
    	</div>
  	</main>
	);
  }

  const itemsCalc = toCalcItems(items);
  const { total, applied, recargos } = calculateTotalWith(precios, itemsCalc);
  const dorso = dorsoDelPedido(items);

  const subirDorso = async (file: File) => {
	setErrorDorso("");
	setSubiendoDorso(true);
	try {
  	const data = await uploadImage(file);
  	setDorsoTodos(data.url, data.originalName || file.name);
	} catch (err: unknown) {
  	setErrorDorso(err instanceof Error ? err.message : "No se pudo subir");
	}
	setSubiendoDorso(false);
	if (dorsoInputRef.current) dorsoInputRef.current.value = "";
  };
  // Si está a pocas cartas de una promo, conviene avisarle: entre 152 y 159
  // cartas se paga más que por 160.
  const sugerencia = sugerenciaPromo(precios, itemsCalc);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const faltan = Math.max(0, MIN_CARDS - totalQty);
  const cumpleMin = totalQty >= MIN_CARDS;
  const hayBloqueados = items.some(
	(i) => !finishDisponible(precios, i.finish)
  );

  return (
	<main className="min-h-screen bg-surface text-ink-soft">
  	<NavBar />

  	<div className="max-w-5xl mx-auto px-6 py-10">
    	<Reveal>
      	<h1 className="font-display font-extrabold text-3xl md:text-4xl mb-8">
        	Tu <span className="text-lava">carrito</span>
      	</h1>
    	</Reveal>

    	{items.length === 0 ? (
      	<Reveal className="text-center py-20">
        	<ShoppingBag className="mx-auto text-ink-faint mb-4" size={48} />
        	<p className="text-ink-muted mb-6">Tu carrito está vacío</p>
        	<button
          	onClick={() => router.push("/catalogo")}
          	className="btn-flame px-6 py-3 rounded-lg font-semibold transition-all"
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
                  	className="w-[60px] h-[84px] rounded bg-surface-3 flex-shrink-0 bg-center bg-contain bg-no-repeat"
                  	style={{ backgroundImage: `url(${it.image})` }}
                	/>
                	<div className="flex-1">
                  	<p className="font-semibold">{it.name}</p>
                  	<p className="text-xs text-ink-muted uppercase">
                    	{it.set_name}
                  	</p>
                  	{it.dorsoUrl ? (
                    	<p className="text-[10px] text-flame-ink mt-1">
                      	Con dorso personalizado
                    	</p>
                  	) : null}
                  	<div className="mt-2 max-w-[180px]">
                    	<FinishButtons
                      	precios={precios}
                      	value={it.finish}
                      	onChange={(f) => updateFinish(idx, f)}
                      	size="xs"
                    	/>
                    	{!finishDisponible(precios, it.finish) ? (
                      	<p className="text-[10px] text-red-700 mt-1">
                        	Este acabado no está disponible — cámbialo para
                        	poder pagar.
                      	</p>
                    	) : null}
                  	</div>
                  	<div className="flex items-center gap-3 mt-3">
                    	<label className="text-xs text-ink-muted">Cant:</label>
                    	<input
                      	type="number"
                      	min={1}
                      	max={100}
                      	value={it.quantity}
                      	onChange={(e) =>
                        	updateQty(idx, Number(e.target.value) || 1)
                      	}
                      	className="w-20 bg-surface-2 border border-line rounded px-2 py-1 text-sm"
                    	/>
                    	<button
                      	onClick={() => removeFromCart(idx)}
                      	className="text-red-700 hover:text-red-700 ml-auto"
                      	title="Eliminar"
                    	>
                      	<Trash2 size={18} />
                    	</button>
                  	</div>
                	</div>
              	</div>
            	);
          	})}
        	  <div className="glass-card p-4 rounded-xl">
            	<div className="flex items-start gap-3">
              	<div className="flex-1">
                	<h3 className="font-semibold text-sm">
                  	Dorso personalizado{" "}
                  	<span className="text-ink-faint font-normal">(opcional)</span>
                	</h3>
                	<p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  	Por defecto el reverso va blanco liso. Puedes subir una
                  	imagen y la imprimimos al dorso de todas las cartas del
                  	pedido: {formatCLP(precios.dorso_diseno)} por el diseño (una
                  	sola vez) + {formatCLP(precios.dorso_carta)} por carta.
                	</p>
                	<p className="text-[11px] text-ink-faint mt-1">
                  	Las cartas dobles MDFC llevan su reverso real impreso sin
                  	costo extra — esto es solo para dorsos tuyos.
                	</p>
              	</div>
              	{dorso ? (
                	<div
                  	role="img"
                  	aria-label={dorso.nombre}
                  	className="w-[48px] h-[67px] rounded bg-surface-3 flex-shrink-0 bg-center bg-cover bg-no-repeat ring-1 ring-flame"
                  	style={{ backgroundImage: `url(${dorso.url})` }}
                	/>
              	) : null}
            	</div>

            	<input
              	ref={dorsoInputRef}
              	type="file"
              	accept="image/jpeg,image/png,image/webp"
              	className="hidden"
              	onChange={(e) => {
                	const f = e.target.files?.[0];
                	if (f) subirDorso(f);
              	}}
            	/>

            	{dorso ? (
              	<div className="flex items-center gap-3 mt-3">
                	<p className="text-xs text-ink-soft truncate flex-1">
                  	{dorso.nombre}
                	</p>
                	<button
                  	onClick={() => dorsoInputRef.current?.click()}
                  	className="text-xs text-ink-muted hover:text-ink"
                	>
                  	Cambiar
                	</button>
                	<button
                  	onClick={() => quitarDorsoTodos()}
                  	className="text-xs text-red-700 hover:text-red-700 inline-flex items-center gap-1"
                	>
                  	<X size={12} /> Quitar
                	</button>
              	</div>
            	) : (
              	<button
                	onClick={() => dorsoInputRef.current?.click()}
                	disabled={subiendoDorso}
                	className="mt-3 w-full border border-dashed border-line hover:border-flame rounded-lg py-2.5 text-xs text-ink-soft inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              	>
                	{subiendoDorso ? (
                  	<>
                    	<Loader2 className="animate-spin" size={14} /> Subiendo…
                  	</>
                	) : (
                  	<>
                    	<Upload size={14} /> Subir un dorso para todo el pedido
                  	</>
                	)}
              	</button>
            	)}

            	{errorDorso ? (
              	<p className="text-xs text-red-700 mt-2">{errorDorso}</p>
            	) : null}
          	</div>
        	</div>

        	<aside className="block-card p-6 rounded-xl h-fit sticky top-24">
          	<h2 className="font-display font-bold text-lg mb-4">Resumen</h2>

          	<div className="flex justify-between text-sm mb-2">
            	<span className="text-ink-muted">Cartas totales</span>
            	<span className={cumpleMin ? "" : "text-amber-700"}>
              	{totalQty}
            	</span>
          	</div>
          	<div className="flex justify-between text-sm mb-4 gap-3">
            	<span className="text-ink-muted flex-shrink-0">
              	Tarifa aplicada
            	</span>
            	<span className="text-flame-ink text-right">{applied}</span>
          	</div>

          	{sugerencia && cumpleMin && (
            	<div className="bg-flame-tint border border-flame/60 p-3 rounded-lg mb-4">
              	<p className="text-xs font-semibold text-flame-ink">
                	💡 Agrega {sugerencia.faltan} carta
                	{sugerencia.faltan !== 1 ? "s" : ""}{" "}
                	{FINISH_INFO[sugerencia.finish].label} y pagas{" "}
                	{formatCLP(sugerencia.ahorro)} menos
              	</p>
              	<p className="text-[11px] text-flame-ink/70 mt-1">
                	Alcanzas la promo y el pedido queda en{" "}
                	{formatCLP(sugerencia.totalConPromo)}, aunque lleves más
                	cartas.
              	</p>
            	</div>
          	)}

          	{!cumpleMin && (
            	<div className="bg-yellow-500/10 border border-amber-700/35 p-3 rounded-lg mb-4 flex gap-2">
              	<AlertCircle
                	className="text-amber-700 flex-shrink-0"
                	size={16}
              	/>
              	<div className="text-xs text-amber-700">
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

          	{recargos.customTotal > 0 || recargos.dorsoTotal > 0 ? (
            	<div className="border-t border-line pt-3 mb-3 space-y-1.5">
              	{recargos.customTotal > 0 ? (
                	<div className="flex justify-between text-xs gap-3">
                  	<span className="text-ink-muted">
                    	Preparación de {recargos.customDisenos} diseño
                    	{recargos.customDisenos !== 1 ? "s" : ""} custom
                  	</span>
                  	<span>{formatCLP(recargos.customTotal)}</span>
                	</div>
              	) : null}
              	{recargos.dorsoTotal > 0 ? (
                	<div className="flex justify-between text-xs gap-3">
                  	<span className="text-ink-muted">
                    	Dorso personalizado ({recargos.dorsoCartas} carta
                    	{recargos.dorsoCartas !== 1 ? "s" : ""})
                  	</span>
                  	<span>{formatCLP(recargos.dorsoTotal)}</span>
                	</div>
              	) : null}
            	</div>
          	) : null}

          	<div className="border-t border-line pt-4 mb-4">
            	<div className="flex justify-between items-center">
              	<span className="text-ink-muted">Subtotal cartas</span>
              	<span className="text-2xl font-display font-bold text-lava">
                	{formatCLP(total)}
              	</span>
            	</div>
          	</div>

          	<div className="bg-surface-2 border border-line rounded-lg p-3 mb-6 flex gap-2 text-xs text-ink-soft">
            	<Truck
              	size={16}
              	className="text-flame-ink flex-shrink-0 mt-0.5"
            	/>
            	<div>
              	<p>
                	En el checkout puedes elegir{" "}
                	<b className="text-ink">retiro en Pucón (gratis)</b> o
                	envío único de{" "}
                	<b className="text-ink">{formatCLP(SHIPPING_COST)}</b> a
                	todo Chile.
              	</p>
            	</div>
          	</div>

          	<button
            	onClick={() => router.push("/checkout")}
            	disabled={!cumpleMin || hayBloqueados}
            	className="w-full btn-flame py-3 rounded-lg font-semibold transition-all disabled:cursor-not-allowed disabled:shadow-none"
          	>
            	{hayBloqueados
              	? "Hay acabados no disponibles"
              	: cumpleMin
              	? "Ir a pagar"
              	: `Faltan ${faltan} carta(s)`}
          	</button>
          	<p className="text-xs text-ink-faint text-center mt-4">
            	Flow.cl o transferencia
          	</p>
        	</aside>
      	</Reveal>
    	)}
  	</div>
	</main>
  );
}

