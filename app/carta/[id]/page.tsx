"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ShoppingCart } from "lucide-react";
import NavBar from "@/components/NavBar";
import ManaSymbols from "@/components/ManaSymbols";
import {
  getCardById,
  getAllPrints,
  getCardImage,
  type ScryfallCard,
} from "@/lib/scryfall";
import { PRICES, formatCLP, type Finish } from "@/lib/pricing";

export default function CartaDetalle() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<ScryfallCard | null>(null);
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [selectedPrint, setSelectedPrint] = useState<ScryfallCard | null>(null);
  const [finish, setFinish] = useState<Finish>("glossy");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
	(async () => {
  	if (!id) return;
  	const c = await getCardById(id);
  	setCard(c);
  	setSelectedPrint(c);
  	if (c) {
    	const p = await getAllPrints(c.oracle_id);
    	setPrints(p);
  	}
  	setLoading(false);
	})();
  }, [id]);

  const addToCart = () => {
	if (!selectedPrint) return;
	const cart = JSON.parse(localStorage.getItem("cart") || "[]");
	cart.push({
  	id: selectedPrint.id,
  	name: selectedPrint.name,
  	set: selectedPrint.set,
  	set_name: selectedPrint.set_name,
  	collector_number: selectedPrint.collector_number,
  	image: getCardImage(selectedPrint, "small"),
  	finish,
  	quantity: qty,
	});
	localStorage.setItem("cart", JSON.stringify(cart));
	window.dispatchEvent(new Event("cart-updated"));
  };

  if (loading) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white">
    	<NavBar />
    	<div className="flex items-center justify-center py-32">
      	<Loader2 className="animate-spin text-[#FF4D1A]" size={40} />
    	</div>
  	</main>
	);
  }

  if (!card) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white">
    	<NavBar />
    	<p className="text-center py-32">Carta no encontrada.</p>
  	</main>
	);
  }

  const display = selectedPrint || card;
  const unitPrice = finish === "glossy" ? PRICES.glossy : PRICES.matte;

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<div className="max-w-6xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/catalogo")}
      	className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al catálogo
    	</button>

    	<div className="grid md:grid-cols-2 gap-10">
      	<div className="relative aspect-[5/7] rounded-xl overflow-hidden bg-[#1E242B]">
        	<img
          	src={getCardImage(display, "large")}
          	alt={display.name}
          	className="w-full h-full object-cover"
        	/>
      	</div>

      	<div>
        	<h1 className="text-3xl font-bold mb-1">{display.name}</h1>
        	<p className="text-sm text-gray-400 mb-4">
          	{display.set_name} · #{display.collector_number} ·{" "}
          	<span className="capitalize">{display.rarity}</span>
        	</p>

        	{display.mana_cost ? (
          	<p className="mb-2 flex items-center gap-2 flex-wrap">
            	<span className="text-gray-400 text-sm">Costo:</span>
            	<ManaSymbols text={display.mana_cost} size={20} />
          	</p>
        	) : null}
        	{display.type_line ? (
          	<p className="mb-2">
            	<span className="text-gray-400 text-sm">Tipo: </span>
            	{display.type_line}
          	</p>
        	) : null}
        	{display.oracle_text ? (
          	<div className="mb-4 text-sm bg-[#1E242B] p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
            	<ManaSymbols text={display.oracle_text} size={14} />
          	</div>
        	) : null}
        	{display.power || display.toughness ? (
          	<p className="mb-2">
            	<span className="text-gray-400 text-sm">P/R: </span>
            	{display.power}/{display.toughness}
          	</p>
        	) : null}
        	{display.loyalty ? (
          	<p className="mb-2">
            	<span className="text-gray-400 text-sm">Lealtad: </span>
            	{display.loyalty}
          	</p>
        	) : null}
        	{display.artist ? (
          	<p className="mb-6 text-sm text-gray-400">
            	Ilustrador: {display.artist}
          	</p>
        	) : null}

        	{prints.length > 1 ? (
          	<div className="mb-6">
            	<p className="text-sm font-semibold mb-2">
              	Elige el arte ({prints.length} versiones)
            	</p>
            	<div className="flex gap-2 overflow-x-auto pb-2">
              	{prints.map((p) => {
                	const isSel = selectedPrint?.id === p.id;
                	const btnClass =
                  	"relative flex-shrink-0 w-20 aspect-[5/7] rounded border-2 overflow-hidden transition " +
                  	(isSel
                    	? "border-[#FF4D1A]"
                    	: "border-white/10 hover:border-white/30");
                	return (
                  	<button
                    	key={p.id}
                    	onClick={() => setSelectedPrint(p)}
                    	className={btnClass}
                  	>
                    	<img
                      	src={getCardImage(p, "small")}
                      	alt={p.set_name}
                      	className="w-full h-full object-cover"
                    	/>
                  	</button>
                	);
              	})}
            	</div>
          	</div>
        	) : null}

        	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
          	<p className="text-sm font-semibold mb-3">Acabado</p>
          	<div className="flex gap-2 mb-4">
            	<button
              	onClick={() => setFinish("glossy")}
              	className={
                	"flex-1 py-2 rounded-lg border transition " +
                	(finish === "glossy"
                  	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                  	: "border-white/10")
              	}
            	>
              	Glossy · {formatCLP(PRICES.glossy)}
            	</button>
            	<button
              	onClick={() => setFinish("matte")}
              	className={
                	"flex-1 py-2 rounded-lg border transition " +
                	(finish === "matte"
                  	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                  	: "border-white/10")
              	}
            	>
              	Matte · {formatCLP(PRICES.matte)}
            	</button>
          	</div>

          	<p className="text-sm font-semibold mb-2">Cantidad</p>
          	<input
            	type="number"
            	min={1}
            	max={20}
            	value={qty}
            	onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 mb-4"
          	/>

          	<div className="flex justify-between items-center mb-4">
            	<span className="text-gray-400">Subtotal</span>
            	<span className="text-2xl font-bold text-[#FF4D1A]">
              	{formatCLP(unitPrice * qty)}
            	</span>
          	</div>

          	<button
            	onClick={addToCart}
            	className="w-full bg-[#FF4D1A] hover:bg-[#e64418] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          	>
            	<ShoppingCart size={18} /> Agregar al carrito
          	</button>
          	<p className="text-xs text-gray-400 text-center mt-2">
            	Tip: el ícono del carrito en la barra superior se actualiza al instante.
          	</p>
        	</div>
      	</div>
    	</div>
  	</div>
	</main>
  );
}

