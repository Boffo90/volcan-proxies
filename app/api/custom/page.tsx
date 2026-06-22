"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Loader2, ShoppingCart, Plus } from "lucide-react";
import NavBar from "@/components/NavBar";
import { addToCart } from "@/lib/cart";
import { formatCLP, type Finish } from "@/lib/pricing";
import { usePrecios } from "@/hooks/usePrecios";

type CustomUpload = {
  url: string;
  filename: string;
  originalName: string;
  cardName: string;
  finish: Finish;
  quantity: number;
};

export default function CustomPage() {
  const router = useRouter();
  const { precios } = usePrecios();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<CustomUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (files: FileList) => {
	setError("");
	setUploading(true);
	const newUploads: CustomUpload[] = [];

	for (const file of Array.from(files)) {
  	const fd = new FormData();
  	fd.append("file", file);
  	try {
    	const res = await fetch("/api/custom/upload", {
      	method: "POST",
      	body: fd,
    	});
    	const data = await res.json();
    	if (!res.ok) throw new Error(data.error || "Error al subir");

    	newUploads.push({
      	url: data.url,
      	filename: data.filename,
      	originalName: data.originalName,
      	cardName: file.name.replace(/\.[^/.]+$/, ""),
      	finish: "glossy",
      	quantity: 1,
    	});
  	} catch (err: unknown) {
    	const msg = err instanceof Error ? err.message : "Error";
    	setError("Error con " + file.name + ": " + msg);
  	}
	}

	setUploads((prev) => [...prev, ...newUploads]);
	setUploading(false);
	if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateUpload = (
	idx: number,
	field: keyof CustomUpload,
	value: string | number
  ) => {
	setUploads((prev) => {
  	const next = [...prev];
  	next[idx] = { ...next[idx], [field]: value };
  	return next;
	});
  };

  const removeUpload = (idx: number) => {
	setUploads((prev) => prev.filter((_, i) => i !== idx));
  };

  const addAllToCart = () => {
	if (uploads.length === 0) return;
	uploads.forEach((u) => {
  	addToCart({
    	id: "custom-" + u.filename,
    	name: u.cardName || "Carta Custom",
    	set: "CUSTOM",
    	set_name: "Carta personalizada",
    	collector_number: "-",
    	image: u.url,
    	finish: u.finish,
    	quantity: u.quantity,
    	isCustom: true,
  	});
	});
	router.push("/carrito");
  };

  const subtotal = uploads.reduce((s, u) => {
	const unit = u.finish === "glossy" ? precios.glossy : precios.matte;
	return s + (unit + precios.custom_surcharge) * u.quantity;
  }, 0);

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<div className="max-w-5xl mx-auto px-6 py-10">
    	<h1 className="text-3xl md:text-4xl font-bold mb-2">
      	Cartas <span className="text-[#FF4D1A]">Custom</span>
    	</h1>
    	<p className="text-gray-400 mb-8">
      	Sube tus propias imágenes (JPG/PNG, máx 5MB). Recargo de{" "}
      	{formatCLP(precios.custom_surcharge)} por carta.
    	</p>

    	<div className="bg-[#1E242B] border-2 border-dashed border-white/20 hover:border-[#FF4D1A]/50 transition rounded-xl p-10 text-center mb-6">
      	<Upload className="mx-auto text-[#FF4D1A] mb-4" size={40} />
      	<p className="font-semibold mb-2">
        	Arrastra tus imágenes aquí o haz click
      	</p>
      	<p className="text-xs text-gray-400 mb-4">
        	Formatos: JPG, PNG · Máx 5MB por archivo
      	</p>
      	<input
        	ref={fileInputRef}
        	type="file"
        	multiple
        	accept="image/jpeg,image/png,image/jpg"
        	onChange={(e) => e.target.files && handleFiles(e.target.files)}
        	className="hidden"
        	id="file-input"
      	/>
      	<label
        	htmlFor="file-input"
        	className="inline-flex items-center gap-2 bg-[#FF4D1A] hover:bg-[#e64418] px-5 py-2.5 rounded-lg font-semibold cursor-pointer transition"
      	>
        	{uploading ? (
          	<Loader2 className="animate-spin" size={16} />
        	) : (
          	<Plus size={16} />
        	)}
        	{uploading ? "Subiendo..." : "Elegir archivos"}
      	</label>
      	{error ? (
        	<p className="text-sm text-red-400 mt-4">{error}</p>
      	) : null}
    	</div>

    	{uploads.length > 0 && (
      	<>
        	<h2 className="font-bold text-lg mb-4">
          	Tus cartas ({uploads.length})
        	</h2>
        	<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          	{uploads.map((u, idx) => (
            	<div
              	key={u.filename}
              	className="bg-[#1E242B] p-4 rounded-xl border border-white/10"
            	>
              	<div
                	role="img"
                	aria-label={u.cardName}
                	className="w-full aspect-[5/7] rounded-lg mb-3 bg-[#0F1115] bg-center bg-contain bg-no-repeat"
                	style={{ backgroundImage: `url(${u.url})` }}
              	/>

              	<label className="block text-xs text-gray-400 mb-1">
                	Nombre de referencia
              	</label>
              	<input
                	value={u.cardName}
                	onChange={(e) =>
                  	updateUpload(idx, "cardName", e.target.value)
                	}
                	placeholder="Mi token, alter, etc."
                	className="w-full bg-[#0F1115] border border-white/10 rounded px-2 py-1.5 text-sm mb-3"
              	/>

              	<label className="block text-xs text-gray-400 mb-1">
                	Acabado
              	</label>
              	<div className="flex gap-2 mb-3">
                	<button
                  	onClick={() => updateUpload(idx, "finish", "glossy")}
                  	className={
                    	"flex-1 py-1.5 rounded border text-xs transition " +
                    	(u.finish === "glossy"
                      	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                      	: "border-white/10")
                  	}
                	>
                  	Glossy
                	</button>
                	<button
                  	onClick={() => updateUpload(idx, "finish", "matte")}
                  	className={
                    	"flex-1 py-1.5 rounded border text-xs transition " +
                    	(u.finish === "matte"
                      	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                      	: "border-white/10")
                  	}
                	>
                  	Matte
                	</button>
              	</div>

              	<label className="block text-xs text-gray-400 mb-1">
                	Cantidad
              	</label>
              	<div className="flex gap-2 items-center">
                	<input
                  	type="number"
                  	min={1}
                  	max={100}
                  	value={u.quantity}
                  	onChange={(e) =>
                    	updateUpload(
                      	idx,
                      	"quantity",
                      	Math.max(1, Number(e.target.value) || 1)
                    	)
                  	}
                  	className="flex-1 bg-[#0F1115] border border-white/10 rounded px-2 py-1.5 text-sm"
                	/>
                	<button
                  	onClick={() => removeUpload(idx)}
                  	className="text-red-400 hover:text-red-300 p-1.5"
                  	title="Eliminar"
                	>
                  	<Trash2 size={16} />
                	</button>
              	</div>
            	</div>
          	))}
        	</div>

        	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-4 sticky bottom-4">
          	<div>
            	<p className="text-xs text-gray-400">
              	Subtotal estimado (sin promos)
            	</p>
            	<p className="text-2xl font-bold text-[#FF4D1A]">
              	{formatCLP(subtotal)}
            	</p>
          	</div>
          	<button
            	onClick={addAllToCart}
            	className="bg-[#FF4D1A] hover:bg-[#e64418] px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
          	>
            	<ShoppingCart size={18} /> Agregar todas al carrito
          	</button>
        	</div>
      	</>
    	)}

    	<div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg mt-8">
      	<h3 className="font-semibold text-yellow-300 text-sm mb-2">
        	💡 Tips para mejores resultados
      	</h3>
      	<ul className="text-sm text-yellow-200/80 space-y-1 list-disc list-inside">
        	<li>
          	Usa imágenes de **alta resolución** (mínimo 750×1050 px para
          	tamaño carta)
        	</li>
        	<li>Proporción ideal: 5:7 (vertical)</li>
        	<li>Evita imágenes muy oscuras o con artefactos JPG</li>
        	<li>
          	Si quieres bordes negros tipo MTG, agrégalos antes de subir
        	</li>
      	</ul>
    	</div>
  	</div>
	</main>
  );
}

