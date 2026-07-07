"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ShoppingCart } from "lucide-react";
import NavBar from "@/components/NavBar";
import { addToCart } from "@/lib/cart";
import { formatCLP, type Finish } from "@/lib/pricing";
import { usePrecios } from "@/hooks/usePrecios";

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
  	<main className="min-h-screen bg-[#0F1115] text-white">
    	<NavBar />
    	<div className="flex items-center justify-center py-32">
      	<Loader2 className="animate-spin text-[#FF4D1A]" size={40} />
    	</div>
  	</main>
	);
  }

  if (!custom) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white">
    	<NavBar />
    	<p className="text-center py-32">Diseño no encontrado.</p>
  	</main>
	);
  }

  const surcharge = custom.surcharge ?? precios.custom_surcharge;
  const unitPrice = (finish === "glossy" ? precios.glossy : precios.matte) + surcharge;

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
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<div className="max-w-6xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/customs")}
      	className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
    	>
      	<ArrowLeft size={16} /> Volver a la galería
    	</button>

    	<div className="grid md:grid-cols-2 gap-10">
      	<div
        	role="img"
        	aria-label={custom.name}
        	className="relative aspect-[5/7] rounded-xl overflow-hidden bg-[#1E242B] bg-center bg-cover bg-no-repeat"
        	style={{ backgroundImage: `url(${custom.image_url})` }}
      	/>

      	<div>
        	<h1 className="text-3xl font-bold mb-1">{custom.name}</h1>
        	{custom.tags.length > 0 ? (
          	<p className="text-sm text-gray-400 mb-4">
            	{custom.tags.join(" · ")}
          	</p>
        	) : null}
        	{custom.description ? (
          	<p className="mb-6 text-sm text-gray-300 leading-relaxed">
            	{custom.description}
          	</p>
        	) : null}

        	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
          	<p className="text-sm font-semibold mb-3">Acabado</p>
          	<div className="flex gap-2 mb-4">
            	{custom.finish_options.includes("glossy") ? (
              	<button
                	onClick={() => setFinish("glossy")}
                	className={
                  	"flex-1 py-2 rounded-lg border transition " +
                  	(finish === "glossy"
                    	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                    	: "border-white/10")
                	}
              	>
                	Glossy · {formatCLP(precios.glossy + surcharge)}
              	</button>
            	) : null}
            	{custom.finish_options.includes("matte") ? (
              	<button
                	onClick={() => setFinish("matte")}
                	className={
                  	"flex-1 py-2 rounded-lg border transition " +
                  	(finish === "matte"
                    	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                    	: "border-white/10")
                	}
              	>
                	Matte · {formatCLP(precios.matte + surcharge)}
              	</button>
            	) : null}
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
            	onClick={handleAddToCart}
            	className="w-full bg-[#FF4D1A] hover:bg-[#e64418] py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
          	>
            	<ShoppingCart size={18} />
            	{added ? "¡Agregado!" : "Agregar al carrito"}
          	</button>
        	</div>
      	</div>
    	</div>
  	</div>
	</main>
  );
}
