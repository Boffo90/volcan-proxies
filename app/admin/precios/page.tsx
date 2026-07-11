"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { PRECIOS_DEFAULT, type Precios } from "@/lib/pricing";

type PrecioNumerico = Exclude<
  keyof Precios,
  "glossy_disponible" | "matte_disponible"
>;

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
	// Merge con defaults para que configs antiguas sin los flags nuevos
	// (glossy_disponible / matte_disponible) los tomen como true.
	setPrecios({ ...PRECIOS_DEFAULT, ...data.precios });
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
  	<main className="min-h-screen bg-[#0b0d11] text-white flex justify-center py-32">
    	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
  	</main>
	);
  }

  const fields: Array<{ key: PrecioNumerico; label: string; help?: string }> = [
	{ key: "glossy", label: "Carta unitaria Glossy" },
	{ key: "matte", label: "Carta unitaria Matte" },
	{ key: "mazo60_glossy", label: "Promo Mazo 60 Glossy", help: "Precio total por 60 cartas" },
	{ key: "mazo60_matte", label: "Promo Mazo 60 Matte" },
	{ key: "commander100_glossy", label: "Promo Commander 100 Glossy" },
	{ key: "commander100_matte", label: "Promo Commander 100 Matte" },
	{ key: "custom_surcharge", label: "Recargo por carta custom" },
  ];

  const toggles: Array<{
	key: "glossy_disponible" | "matte_disponible";
	label: string;
  }> = [
	{ key: "glossy_disponible", label: "Glossy disponible" },
	{ key: "matte_disponible", label: "Matte disponible" },
  ];

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
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

    	<div className="bg-[#1E242B] p-6 rounded-xl border border-white/10 mb-6">
      	<h2 className="font-bold mb-1">Disponibilidad de acabados</h2>
      	<p className="text-xs text-gray-400 mb-4">
        	Al desactivar un acabado, en la tienda aparece bloqueado con
        	&quot;No disponible por ahora&quot; y el servidor rechaza pedidos
        	que lo incluyan.
      	</p>
      	<div className="flex gap-3">
        	{toggles.map((t) => {
          	const on = precios[t.key];
          	return (
            	<button
              	key={t.key}
              	onClick={() => setPrecios({ ...precios, [t.key]: !on })}
              	className={
                	"flex-1 py-3 rounded-lg border font-semibold transition " +
                	(on
                  	? "border-green-500/50 bg-green-500/10 text-green-300"
                  	: "border-red-500/40 bg-red-500/10 text-red-300")
              	}
            	>
              	{t.label}: {on ? "SÍ" : "NO"}
            	</button>
          	);
        	})}
      	</div>
    	</div>

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
            	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2"
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
          	<p className="text-xs text-gray-500">Click &quot;Guardar&quot; para aplicar</p>
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

    	<div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg mt-6">
      	<p className="text-sm text-green-300">
        	<b>Nota:</b> Estos precios se reflejan automáticamente en todo el
        	sitio (catálogo, carrito, checkout) y son los que se cobran al
        	confirmar un pedido.
      	</p>
    	</div>
  	</div>
	</main>
  );
}
