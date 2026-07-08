"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search, Loader2, Shuffle } from "lucide-react";
import NavBar from "@/components/NavBar";
import Reveal from "@/components/animation/Reveal";
import {
  searchCards,
  getRandomCards,
  getCardImage,
  type ScryfallCard,
} from "@/lib/scryfall";

function CatalogoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") || "";

  const [query, setQuery] = useState(queryFromUrl);
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<"search" | "random">("random");

  const handleSearch = useCallback(async (q: string) => {
	setLoading(true);
	setMode("search");
	const res = await searchCards(q);
	setCards(res?.data ?? []);
	setTotal(res?.total_cards ?? 0);
	setLoading(false);
  }, []);

  const loadRandom = useCallback(async () => {
	setLoading(true);
	setMode("random");
	const data = await getRandomCards(10);
	setCards(data);
	setTotal(data.length);
	setLoading(false);
  }, []);

  useEffect(() => {
	if (queryFromUrl) {
  	setQuery(queryFromUrl);
  	handleSearch(queryFromUrl);
	} else {
  	loadRandom();
	}
  }, [queryFromUrl, handleSearch, loadRandom]);

  const onSubmit = (e: React.FormEvent) => {
	e.preventDefault();
	if (query.trim()) {
  	router.push("/catalogo?q=" + encodeURIComponent(query.trim()));
	}
  };

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	<section className="px-6 py-10 max-w-6xl mx-auto">
    	<Reveal className="flex items-start justify-between gap-4 mb-2 flex-wrap">
      	<div>
        	<h1 className="font-display font-extrabold text-3xl md:text-4xl">
          	Catálogo <span className="text-lava">MTG</span>
        	</h1>
        	<p className="text-gray-400 mt-2">
          	{mode === "random"
            	? "Selección aleatoria del momento. Usa el buscador para encontrar cartas específicas."
            	: "Resultados de búsqueda"}
        	</p>
      	</div>
      	{mode === "random" && (
        	<button
          	onClick={loadRandom}
          	className="glass-card hover:border-[#FF4D1A]/50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        	>
          	<Shuffle size={16} /> Otras aleatorias
        	</button>
      	)}
    	</Reveal>

    	<form onSubmit={onSubmit} className="flex gap-2 mb-4 mt-6">
      	<div className="relative flex-1">
        	<Search
          	className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          	size={18}
        	/>
        	<input
          	value={query}
          	onChange={(e) => setQuery(e.target.value)}
          	placeholder='Ej: "Lightning Bolt", "t:dragon", "set:dom"'
          	className="w-full glass-card rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[#FF4D1A]/60 transition-colors"
        	/>
      	</div>
      	<button
        	type="submit"
        	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-6 py-3 rounded-lg font-semibold transition-all shadow-[0_4px_20px_-4px_rgba(255,79,26,0.5)]"
      	>
        	Buscar
      	</button>
    	</form>

    	<div className="text-xs text-gray-500 mb-8">
      	Tips: <code>t:creature</code> (tipo) · <code>c:r</code> (color rojo) ·{" "}
      	<code>set:dom</code> (set)
    	</div>

    	{loading ? (
      	<div className="flex items-center justify-center py-20">
        	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
      	</div>
    	) : null}

    	{!loading && cards.length === 0 ? (
      	<p className="text-center text-gray-400 py-20">
        	No se encontraron cartas. Prueba con otra búsqueda.
      	</p>
    	) : null}

    	{!loading && cards.length > 0 ? (
      	<>
        	{mode === "search" && (
          	<p className="text-sm text-gray-400 mb-4">
            	{total.toLocaleString("es-CL")} cartas encontradas (mostrando{" "}
            	{cards.length})
          	</p>
        	)}
        	<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          	{cards.map((card) => {
            	const imgSrc = getCardImage(card, "normal");
            	return (
              	<motion.button
                	key={card.id}
                	onClick={() => router.push("/carta/" + card.id)}
                	whileHover={{ y: -4, scale: 1.02 }}
                	whileTap={{ scale: 0.98 }}
                	transition={{ type: "spring", stiffness: 300, damping: 20 }}
                	className="group relative glass-card rounded-lg overflow-hidden hover:border-[#FF4D1A]/50 transition-colors text-left"
              	>
                	<div className="aspect-[5/7] relative overflow-hidden">
                  	<img
                    	src={imgSrc}
                    	alt={card.name}
                    	className="w-full h-full object-cover"
                  	/>
                	</div>
                	<div className="p-3">
                  	<p className="font-semibold text-sm truncate">
                    	{card.name}
                  	</p>
                  	<p className="text-xs text-gray-400 uppercase truncate">
                    	{card.set_name}
                  	</p>
                	</div>
              	</motion.button>
            	);
          	})}
        	</div>
      	</>
    	) : null}
  	</section>
	</main>
  );
}

export default function CatalogoPage() {
  return (
	<Suspense
  	fallback={
    	<main className="min-h-screen bg-[#0b0d11] text-white">
      	<NavBar />
      	<div className="flex items-center justify-center py-32">
        	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
      	</div>
    	</main>
  	}
	>
  	<CatalogoContent />
	</Suspense>
  );
}

