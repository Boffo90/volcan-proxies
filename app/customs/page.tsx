"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, Palette } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";

type Custom = {
  id: string;
  slug: string;
  name: string;
  tags: string[];
  image_url: string;
};

export default function CustomsGaleria() {
  const router = useRouter();
  const [customs, setCustoms] = useState<Custom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
	fetch("/api/customs")
  	.then((res) => res.json())
  	.then((data) => setCustoms(data.customs || []))
  	.finally(() => setLoading(false));
  }, []);

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	<section className="px-6 py-10 max-w-6xl mx-auto">
    	<Reveal className="mb-8">
      	<Palette className="text-[#FF4D1A] mb-3 drop-shadow-[0_0_10px_rgba(255,79,26,0.6)]" size={40} />
      	<h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2">
        	Galería de <span className="text-lava">customs</span>
      	</h1>
      	<p className="text-gray-400 max-w-2xl">
        	Diseños originales creados por nosotros: alters, arte fan-made y
        	cartas de fantasía. Elige un diseño, acabado y cantidad para
        	agregarlo a tu pedido.
      	</p>
    	</Reveal>

    	{loading ? (
      	<div className="flex items-center justify-center py-20">
        	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
      	</div>
    	) : null}

    	{!loading && customs.length === 0 ? (
      	<p className="text-center text-gray-400 py-20">
        	Aún no hay diseños custom publicados. Vuelve pronto.
      	</p>
    	) : null}

    	{!loading && customs.length > 0 ? (
      	<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        	{customs.map((c) => (
          	<motion.button
            	key={c.id}
            	onClick={() => router.push("/customs/" + c.slug)}
            	whileHover={{ y: -4, scale: 1.02 }}
            	whileTap={{ scale: 0.98 }}
            	transition={{ type: "spring", stiffness: 300, damping: 20 }}
            	className="group relative glass-card rounded-lg overflow-hidden hover:border-[#FF4D1A]/50 transition-colors text-left"
          	>
            	<div className="aspect-[5/7] relative overflow-hidden">
              	<img
                	src={c.image_url}
                	alt={c.name}
                	className="w-full h-full object-cover"
              	/>
            	</div>
            	<div className="p-3">
              	<p className="font-semibold text-sm truncate">{c.name}</p>
              	<p className="text-xs text-gray-400 truncate">
                	{c.tags.join(", ") || "Diseño original"}
              	</p>
            	</div>
          	</motion.button>
        	))}
      	</div>
    	) : null}
  	</section>

  	<Footer />
	</main>
  );
}
