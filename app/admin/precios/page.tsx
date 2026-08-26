"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import {
  FINISHES,
  FINISH_INFO,
  formatCLP,
  normalizePrecios,
  type Finish,
  type Precios,
} from "@/lib/pricing";

/** Grupos de precios que se editan por acabado. */
const GRUPOS: Array<{
  key: "unitario" | "mazo60" | "commander100";
  titulo: string;
  ayuda: string;
  cantidad?: number;
}> = [
  {
	key: "unitario",
	titulo: "Carta unitaria",
	ayuda: "Precio de una carta suelta, por acabado.",
  },
  {
	key: "mazo60",
	titulo: "Promo Mazo 60",
	ayuda: "Precio total del pedido de 60 cartas del mismo acabado.",
	cantidad: 60,
  },
  {
	key: "commander100",
	titulo: "Promo Commander 100",
	ayuda: "Precio total del pedido de 100 cartas del mismo acabado.",
	cantidad: 100,
  },
];

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
	// normalizePrecios acepta el formato viejo (glossy/matte planos) y rellena
	// los acabados que falten, así una config sin migrar no queda en cero.
	setPrecios(normalizePrecios(data.precios));
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

  const setPrecio = (
	grupo: "unitario" | "mazo60" | "commander100",
	f: Finish,
	valor: number
  ) => {
	if (!precios) return;
	setPrecios({ ...precios, [grupo]: { ...precios[grupo], [f]: valor } });
  };

  const toggleDisponible = (f: Finish) => {
	if (!precios) return;
	setPrecios({
  	...precios,
  	disponible: { ...precios.disponible, [f]: !precios.disponible[f] },
	});
  };

  if (loading || !precios) {
	return (
  	<main className="min-h-screen bg-[#0b0d11] text-white flex justify-center py-32">
    	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
  	</main>
	);
  }

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<div className="max-w-4xl mx-auto px-6 py-8">
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
        	&quot;No disponible&quot; y el servidor rechaza pedidos que lo
        	incluyan.
      	</p>
      	<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        	{FINISHES.map((f) => {
          	const on = precios.disponible[f];
          	return (
            	<button
              	key={f}
              	onClick={() => toggleDisponible(f)}
              	className={
                	"py-3 px-2 rounded-lg border font-semibold transition text-sm " +
                	(on
                  	? "border-green-500/50 bg-green-500/10 text-green-300"
                  	: "border-red-500/40 bg-red-500/10 text-red-300")
              	}
            	>
              	{FINISH_INFO[f].label}
              	<span className="block text-xs font-normal">
                	{on ? "disponible" : "oculto"}
              	</span>
            	</button>
          	);
        	})}
      	</div>
    	</div>

    	{GRUPOS.map((g) => (
      	<div
        	key={g.key}
        	className="bg-[#1E242B] p-6 rounded-xl border border-white/10 mb-6"
      	>
        	<h2 className="font-bold mb-1">{g.titulo}</h2>
        	<p className="text-xs text-gray-400 mb-4">{g.ayuda}</p>
        	<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          	{FINISHES.map((f) => {
            	const valor = precios[g.key][f];
            	return (
              	<div key={f}>
                	<label
                  	htmlFor={`${g.key}-${f}`}
                  	className="block text-xs font-semibold mb-1"
                	>
                  	{FINISH_INFO[f].label}
                	</label>
                	<input
                  	id={`${g.key}-${f}`}
                  	type="number"
                  	value={valor}
                  	onChange={(e) =>
                    	setPrecio(g.key, f, Number(e.target.value) || 0)
                  	}
                  	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2"
                	/>
                	{g.cantidad ? (
                  	<p className="text-[11px] text-gray-500 mt-1">
                    	≈ {formatCLP(Math.round(valor / g.cantidad))}/carta
                  	</p>
                	) : null}
              	</div>
            	);
          	})}
        	</div>
      	</div>
    	))}

    	<div className="bg-[#1E242B] p-6 rounded-xl border border-white/10">
      	<label
        	htmlFor="custom_surcharge"
        	className="block text-sm font-semibold mb-1"
      	>
        	Recargo por diseño custom
      	</label>
      	<input
        	id="custom_surcharge"
        	type="number"
        	value={precios.custom_surcharge}
        	onChange={(e) =>
          	setPrecios({
            	...precios,
            	custom_surcharge: Number(e.target.value) || 0,
          	})
        	}
        	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2"
      	/>
      	<p className="text-xs text-gray-500 mt-1">
        	Se cobra una vez por cada imagen distinta, no por copia: preparar
        	el archivo es un solo trabajo aunque pidan veinte copias. Las cartas
        	custom cuentan para las promos como cualquier otra.
      	</p>

      	<div className="border-t border-white/10 pt-4 mt-4">
        	<h3 className="text-sm font-semibold mb-3">Dorso personalizado</h3>

        	<div className="grid sm:grid-cols-2 gap-4">
          	<div>
            	<label
              	htmlFor="dorso_diseno"
              	className="block text-xs text-gray-400 mb-1"
            	>
              	Por diseño de dorso
            	</label>
            	<input
              	id="dorso_diseno"
              	type="number"
              	value={precios.dorso_diseno}
              	onChange={(e) =>
                	setPrecios({
                  	...precios,
                  	dorso_diseno: Number(e.target.value) || 0,
                	})
              	}
              	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2"
            	/>
            	<p className="text-[11px] text-gray-500 mt-1">
              	Una vez por pedido: preparar y calzar el archivo.
            	</p>
          	</div>

          	<div>
            	<label
              	htmlFor="dorso_carta"
              	className="block text-xs text-gray-400 mb-1"
            	>
              	Por carta con dorso
            	</label>
            	<input
              	id="dorso_carta"
              	type="number"
              	value={precios.dorso_carta}
              	onChange={(e) =>
                	setPrecios({
                  	...precios,
                  	dorso_carta: Number(e.target.value) || 0,
                	})
              	}
              	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2"
            	/>
            	<p className="text-[11px] text-gray-500 mt-1">
              	Cubre la segunda pasada por la impresora.
            	</p>
          	</div>
        	</div>

        	<p className="text-xs text-gray-500 mt-3">
          	Un mazo de 100 con un dorso queda en{" "}
          	{formatCLP(precios.dorso_diseno + precios.dorso_carta * 100)} extra
          	({formatCLP(
            	Math.round(precios.dorso_diseno / 100 + precios.dorso_carta)
          	)}
          	/carta). Las MDFC llevan su reverso real sin costo: esto es solo
          	para dorsos que manda el cliente.
        	</p>
      	</div>

      	<div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-center">
        	{savedAt ? (
          	<p className="text-xs text-green-400">Guardado a las {savedAt}</p>
        	) : (
          	<p className="text-xs text-gray-500">
            	Click &quot;Guardar&quot; para aplicar
          	</p>
        	)}
        	<button
          	onClick={handleSave}
          	disabled={saving}
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-5 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
        	>
          	{saving ? (
            	<Loader2 className="animate-spin" size={16} />
          	) : (
            	<Save size={16} />
          	)}
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
