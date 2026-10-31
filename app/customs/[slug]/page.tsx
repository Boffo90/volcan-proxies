"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ShoppingCart } from "lucide-react";
import NavBar from "@/components/NavBar";
import Reveal from "@/components/animation/Reveal";
import { addToCart } from "@/lib/cart";
import {
  defaultFinish,
  FINISH_INFO,
  finishDisponible,
  formatCLP,
  precioUnitario,
  type Finish,
} from "@/lib/pricing";
import { usePrecios } from "@/hooks/usePrecios";
import FinishButtons from "@/components/FinishButtons";

type Custom = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  image_url: string;
  finish_options: string[];
  surcharge: number | null;
};

export default function CustomDetalle() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const { precios } = usePrecios();
  const [custom, setCustom] = useState<Custom | null>(null);
  const [loading, setLoading] = useState(true);
  const [finish, setFinish] = useState<Finish>("glossy");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Si el acabado elegido se desactiva desde el admin, saltar al disponible.
  useEffect(() => {
	if (!finishDisponible(precios, finish)) {
  	setFinish(defaultFinish(precios));
	}
  }, [precios, finish]);

  useEffect(() => {
	(async () => {
  	if (!slug) return;
  	const res = await fetch("/api/customs/" + slug);
  	if (res.ok) {
    	const data = await res.json();
    	setCustom(data.custom);
    	if (data.custom?.finish_options?.length) {
      	setFinish(data.custom.finish_options[0]);
    	}
  	}
  	setLoading(false);
	})();
  }, [slug]);

  if (loading) {
	return (
  	<main className="min-h-screen bg-surface text-ink-soft">
    	<NavBar />
    	<div className="flex items-center justify-center py-32">
      	<Loader2 className="animate-spin text-flame-ink" size={40} />
    	</div>
  	</main>
	);
  }

  if (!custom) {
	return (
  	<main className="min-h-screen bg-surface text-ink-soft">
    	<NavBar />
    	<p className="text-center py-32">Diseño no encontrado.</p>
  	</main>
	);
  }

  // El recargo va una sola vez por diseño: pedir cuatro copias no multiplica el
  // trabajo de preparar el archivo.
  const surcharge = custom.surcharge ?? precios.custom_surcharge;
  const unitPrice = precioUnitario(precios, finish);
  const subtotal = unitPrice * qty + surcharge;

  const handleAddToCart = () => {
	addToCart({
  	id: "custom-" + custom.slug,
  	name: custom.name,
  	set: "CUSTOM",
  	set_name: custom.description || "Diseño personalizado",
  	collector_number: "-",
  	image: custom.image_url,
  	finish,
  	quantity: qty,
  	isCustom: true,
	});
	setAdded(true);
	setTimeout(() => setAdded(false), 2000);
  };

  return (
	<main className="min-h-screen bg-surface text-ink-soft">
  	<NavBar />

  	<div className="max-w-6xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/customs")}
      	className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6"
    	>
      	<ArrowLeft size={16} /> Volver a la galería
    	</button>

    	<Reveal className="grid grid-cols-1 md:grid-cols-2 gap-10">
      	<div
        	role="img"
        	aria-label={custom.name}
        	className="relative aspect-[5/7] rounded-xl overflow-hidden bg-surface-3 ring-1 ring-line bg-center bg-cover bg-no-repeat"
        	style={{ backgroundImage: `url(${custom.image_url})` }}
      	/>

      	<div>
        	<h1 className="font-display font-extrabold text-3xl mb-1">{custom.name}</h1>
        	{custom.tags.length > 0 ? (
          	<p className="text-sm text-ink-muted mb-4">
            	{custom.tags.join(" · ")}
          	</p>
        	) : null}
        	{custom.description ? (
          	<p className="mb-6 text-sm text-ink-soft leading-relaxed">
            	{custom.description}
          	</p>
        	) : null}

        	<div className="glass-card p-5 rounded-xl">
          	<p className="text-sm font-semibold mb-3">Acabado</p>
          	<div className="mb-4">
            	<FinishButtons
              	precios={precios}
              	value={finish}
              	onChange={setFinish}
              	allowed={custom.finish_options as Finish[]}
            	/>
          	</div>

          	<p className="text-sm font-semibold mb-2">Cantidad</p>
          	<input
            	type="number"
            	min={1}
            	max={20}
            	value={qty}
            	onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            	className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 mb-4"
          	/>

          	<div className="text-xs text-ink-muted space-y-1 mb-3">
            	<div className="flex justify-between gap-3">
              	<span>
                	{qty} × {FINISH_INFO[finish].corto}
              	</span>
              	<span>{formatCLP(unitPrice * qty)}</span>
            	</div>
            	<div className="flex justify-between gap-3">
              	<span>Preparación del diseño (una vez)</span>
              	<span>{formatCLP(surcharge)}</span>
            	</div>
          	</div>

          	<div className="flex justify-between items-center mb-4">
            	<span className="text-ink-muted">Subtotal</span>
            	<span className="text-2xl font-display font-bold text-lava">
              	{formatCLP(subtotal)}
            	</span>
          	</div>

          	<button
            	onClick={handleAddToCart}
            	className="w-full btn-flame py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
          	>
            	<ShoppingCart size={18} />
            	{added ? "¡Agregado!" : "Agregar al carrito"}
          	</button>
        	</div>
      	</div>
    	</Reveal>
  	</div>
	</main>
  );
}
