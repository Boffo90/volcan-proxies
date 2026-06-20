"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import NavBar from "@/components/NavBar";
import { searchCards, getCardImage, type ScryfallCard } from "@/lib/scryfall";

const SCRYFALL_SYNTAX_URL = "https://scryfall.com/docs/syntax";

export default function CatalogoPage() {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
	if (!q.trim()) return;
	setLoading(true);
	setSearched(true);
	const res = await searchCards(q);
	setCards(res?.data ?? []);
	setTotal(res?.total_cards ?? 0);
	setLoading(false);
  }, []);

  useEffect(() => {
	handleSearch("is:commander");
  }, [handleSearch]);

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<section className="px-6 py-10 max-w-6xl mx-auto">
    	<h1 className="text-3xl md:text-4xl font-bold mb-2">
      	Catálogo <span className="text-[#FF4D1A]">MTG</span>
    	</h1>
    	<p className="text-gray-400 mb-8">
      	Busca cualquier carta. Cuando entres al detalle puedes elegir el arte.
    	</p>

    	<form
      	onSubmit={(e) => {
        	e.preventDefault();
        	handleSearch(query);
      	}}
      	className="flex gap-2 mb-4"
    	>
      	<div className="relative flex-1">
        	<Search
          	className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          	size={18}
        	/>
        	<input
          	value={query}
          	onChange={(e) => setQuery(e.target.value)}
          	placeholder='Ej: "Lightning Bolt", "t:dragon", "set:dom"'
          	className="w-full bg-[#1E242B] border border-white/10 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#FF4D1A]"
        	/>
      	</div>
      	<button
        	type="submit"
        	className="bg-[#FF4D1A] hover:bg-[#e64418] px-6 py-3 rounded-lg font-semibold transition"
      	>
        	Buscar
      	</button>
    	</form>

    	<div className="text-xs text-gray-500 mb-8">
      	Tips: <code>t:creature</code> (tipo) · <code>c:r</code> (color rojo) ·{" "}
      	<code>set:dom</code> (set) ·{" "}
      	<a
        	href={SCRYFALL_SYNTAX_URL}
        	target="_blank"
        	rel="noreferrer"
        	className="text-[#FF4D1A] underline"
      	>
        	sintaxis completa
      	</a>
    	</div>

    	{loading ? (
      	<div className="flex items-center justify-center py-20">
        	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
      	</div>
    	) : null}

    	{!loading && searched && cards.length === 0 ? (
      	<p className="text-center text-gray-400 py-20">
        	No se encontraron cartas. Prueba con otra búsqueda.
      	</p>
    	) : null}

    	{!loading && cards.length > 0 ? (
      	<>
        	<p className="text-sm text-gray-400 mb-4">
          	{total.toLocaleString("es-CL")} cartas encontradas (mostrando{" "}
          	{cards.length})
        	</p>
        	<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          	{cards.map((card) => {
            	const href = `/carta/${card.id}`;
            	const imgSrc = getCardImage(card, "normal");
            	return (
              	<a
                	key={card.id}
                	href={href}
                	className="group relative bg-[#1E242B] rounded-lg overflow-hidden border border-white/5 hover:border-[#FF4D1A]/50 transition"
              	>
                	<div className="aspect-[5/7] relative overflow-hidden">
                  	{}
                  	<img
                    	src={imgSrc}
                    	alt={card.name}
                    	loading="lazy"
                    	className="w-full h-full object-cover group-hover:scale-105 transition"
                  	/>
                	</div>
                	<div className="p-3">
                  	<p className="font-semibold text-sm truncate">
                    	{card.name}
                  	</p>
                  	<p className="text-xs text-gray-400 uppercase">
                    	{card.set_name}
                  	</p>
                	</div>
              	</a>
            	);
          	})}
        	</div>
      	</>
    	) : null}
  	</section>
	</main>
  );
}

