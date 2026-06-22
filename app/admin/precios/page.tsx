"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save } from "lucide-react";

type Precios = {
  glossy: number;
  matte: number;
  mazo60_glossy: number;
  mazo60_matte: number;
  commander100_glossy: number;
  commander100_matte: number;
  custom_surcharge: number;
};

export default function AdminPreciosPage() {
  const router = useRouter();
  const [precios, setPrecios] = useState<Precios | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fetchPrecios = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/precios");
	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}
	const data = await res.json();
	setPrecios(data.precios);
	setLoading(false);
  }, [router]);

  useEffect(() => {
	fetchPrecios();
  }, [fetchPrecios]);

  const handleSave = async () => {
	if (!precios) return;
	setSaving(true);
	await fetch("/api/admin/precios", {
  	method: "PATCH",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify(precios),
	});
	setSaving(false);
	setSavedAt(new Date().toLocaleTimeString("es-CL"));
  };

  if (loading || !precios) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white flex justify-center py-32">
    	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
  	</main>
	);
  }

  const fields: Array<{ key: keyof Precios; label: string; help?: string }> = [
	{ key: "glossy", label: "Carta unitaria Glossy" },
	{ key: "matte", label: "Carta unitaria Matte" },
	{ key: "mazo60_glossy", label: "Promo Mazo 60 Glossy", help: "Precio total por 60 cartas" },
	{ key: "mazo60_matte", label: "Promo Mazo 60 Matte" },
	{ key: "commander100_glossy", label: "Promo Commander 100 Glossy" },
	{ key: "commander100_matte", label: "Promo Commander 100 Matte" },
	{ key: "custom_surcharge", label: "Recargo por carta custom" },
  ];

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<div className="max-w-3xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/admin")}
      	className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al panel
    	</button>

    	<h1 className="text-3xl font-bold mb-2">
      	Editor de <span className="text-[#FF4D1A]">precios</span>
    	</h1>
    	<p className="text-gray-400 mb-6 text-sm">
      	Todos los valores en CLP. Los cambios se guardan en la base de datos.
    	</p>

    	<div className="bg-[#1E242B] p-6 rounded-xl border border-white/10 space-y-4">
      	{fields.map((f) => (
        	<div key={f.key}>
          	<label className="block text-sm font-semibold mb-1">{f.label}</label>
          	<input
            	type="number"
            	value={precios[f.key]}
            	onChange={(e) =>
              	setPrecios({ ...precios, [f.key]: Number(e.target.value) || 0 })
            	}
            	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2"
          	/>
          	{f.help ? (
            	<p className="text-xs text-gray-500 mt-1">{f.help}</p>
          	) : null}
        	</div>
      	))}

      	<div className="border-t border-white/10 pt-4 flex justify-between items-center">
        	{savedAt ? (
          	<p className="text-xs text-green-400">Guardado a las {savedAt}</p>
        	) : (
          	<p className="text-xs text-gray-500">Click "Guardar" para aplicar</p>
        	)}
        	<button
          	onClick={handleSave}
          	disabled={saving}
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-5 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
        	>
          	{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          	Guardar cambios
        	</button>
      	</div>
    	</div>

    	<div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg mt-6">
      	<p className="text-sm text-yellow-300">
        	<b>Nota:</b> Por ahora el catálogo público sigue mostrando los precios del código (`lib/pricing.ts`). En la próxima iteración los sincronizamos para que se reflejen automáticamente en el sitio.
      	</p>
    	</div>
  	</div>
	</main>
  );
}

