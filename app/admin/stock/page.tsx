"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, AlertTriangle, Package } from "lucide-react";
import {
  MATERIALES,
  MATERIAL_INFO,
  STOCK_DEFAULT,
  type MaterialKey,
  type Stock,
} from "@/lib/stock";

type Datos = {
  stock: Stock;
  consumo: Record<MaterialKey, number>;
  pedidosPendientes: number;
};

export default function AdminStockPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [stock, setStock] = useState<Stock>(STOCK_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fetchStock = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/stock");
	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}
	const data = (await res.json()) as Datos;
	setDatos(data);
	setStock(data.stock);
	setLoading(false);
  }, [router]);

  useEffect(() => {
	fetchStock();
  }, [fetchStock]);

  const guardar = async () => {
	setSaving(true);
	await fetch("/api/admin/stock", {
  	method: "PATCH",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify(stock),
	});
	setSaving(false);
	setSavedAt(new Date().toLocaleTimeString("es-CL"));
	await fetchStock();
  };

  const set = (m: MaterialKey, campo: "cantidad" | "minimo", v: number) =>
	setStock((prev) => ({ ...prev, [m]: { ...prev[m], [campo]: v } }));

  const sumar = (m: MaterialKey, delta: number) =>
	setStock((prev) => ({
  	...prev,
  	[m]: { ...prev[m], cantidad: Math.max(0, prev[m].cantidad + delta) },
	}));

  if (loading || !datos) {
	return (
  	<main className="min-h-screen bg-[#0b0d11] text-white flex justify-center py-32">
    	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
  	</main>
	);
  }

  // Alertas: no alcanza para la cola, o quedará bajo el mínimo después.
  const faltantes = MATERIALES.filter(
	(m) => datos.consumo[m] > 0 && stock[m].cantidad < datos.consumo[m]
  );
  const bajoMinimo = MATERIALES.filter(
	(m) => stock[m].cantidad - datos.consumo[m] < stock[m].minimo
  );

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<div className="max-w-4xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/admin")}
      	className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al panel
    	</button>

    	<h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
      	<Package className="text-[#FF4D1A]" size={28} />
      	Stock de <span className="text-[#FF4D1A]">materiales</span>
    	</h1>
    	<p className="text-gray-400 mb-6 text-sm">
      	Los números los llevas tú: actualízalos cuando compres o produzcas.
      	La columna <b>En cola</b> se calcula sola con los{" "}
      	{datos.pedidosPendientes} pedido(s) que todavía no salen.
    	</p>

    	{faltantes.length > 0 && (
      	<div className="bg-red-500/15 border border-red-500/50 p-4 rounded-xl mb-4">
        	<p className="font-bold text-red-200 flex items-center gap-2 text-sm">
          	<AlertTriangle size={16} /> No te alcanza para los pedidos en cola
        	</p>
        	<ul className="text-xs text-red-200/80 mt-2 space-y-1">
          	{faltantes.map((m) => (
            	<li key={m}>
              	• {MATERIAL_INFO[m].label}: tienes {stock[m].cantidad} y
              	necesitas {datos.consumo[m]} —{" "}
              	<b>faltan {datos.consumo[m] - stock[m].cantidad}</b>{" "}
              	{MATERIAL_INFO[m].unidad}
            	</li>
          	))}
        	</ul>
      	</div>
    	)}

    	{faltantes.length === 0 && bajoMinimo.length > 0 && (
      	<div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl mb-4">
        	<p className="font-bold text-yellow-300 flex items-center gap-2 text-sm">
          	<AlertTriangle size={16} /> Conviene reponer pronto
        	</p>
        	<p className="text-xs text-yellow-200/80 mt-1">
          	Después de producir la cola, estos quedan bajo el mínimo que
          	fijaste:{" "}
          	{bajoMinimo.map((m) => MATERIAL_INFO[m].label).join(", ")}.
        	</p>
      	</div>
    	)}

    	<div className="bg-[#1E242B] rounded-xl border border-white/10 overflow-hidden">
      	<div className="overflow-x-auto">
        	<table className="w-full text-sm min-w-[640px]">
          	<thead>
            	<tr className="text-left border-b border-white/10">
              	<th className="p-4 text-xs uppercase tracking-wide text-gray-400 font-semibold">
                	Material
              	</th>
              	<th className="p-4 text-xs uppercase tracking-wide text-gray-400 font-semibold">
                	Tengo
              	</th>
              	<th className="p-4 text-xs uppercase tracking-wide text-gray-400 font-semibold text-right">
                	En cola
              	</th>
              	<th className="p-4 text-xs uppercase tracking-wide text-gray-400 font-semibold text-right">
                	Queda
              	</th>
              	<th className="p-4 text-xs uppercase tracking-wide text-gray-400 font-semibold text-right">
                	Mínimo
              	</th>
            	</tr>
          	</thead>
          	<tbody>
            	{MATERIALES.map((m) => {
              	const info = MATERIAL_INFO[m];
              	const necesita = datos.consumo[m];
              	const queda = stock[m].cantidad - necesita;
              	const critico = queda < 0;
              	const bajo = !critico && queda < stock[m].minimo;

              	return (
                	<tr key={m} className="border-b border-white/5">
                  	<td className="p-4">
                    	<p className="font-semibold">{info.label}</p>
                    	<p className="text-[11px] text-gray-500">
                      	{info.ayuda}
                    	</p>
                  	</td>
                  	<td className="p-4">
                    	<div className="flex items-center gap-1">
                      	<button
                        	onClick={() => sumar(m, -10)}
                        	className="w-7 h-7 rounded bg-[#0F1115] border border-white/10 hover:border-[#FF4D1A] text-xs"
                        	aria-label={`Restar 10 a ${info.label}`}
                      	>
                        	−10
                      	</button>
                      	<input
                        	type="number"
                        	min={0}
                        	value={stock[m].cantidad}
                        	onChange={(e) =>
                          	set(m, "cantidad", Number(e.target.value) || 0)
                        	}
                        	className="w-20 bg-[#0F1115] border border-white/10 rounded px-2 py-1.5 text-center"
                      	/>
                      	<button
                        	onClick={() => sumar(m, 10)}
                        	className="w-7 h-7 rounded bg-[#0F1115] border border-white/10 hover:border-[#FF4D1A] text-xs"
                        	aria-label={`Sumar 10 a ${info.label}`}
                      	>
                        	+10
                      	</button>
                    	</div>
                    	<p className="text-[11px] text-gray-500 mt-1">
                      	{info.unidad}
                    	</p>
                  	</td>
                  	<td className="p-4 text-right text-gray-300">
                    	{necesita > 0 ? necesita : "—"}
                  	</td>
                  	<td
                    	className={
                      	"p-4 text-right font-bold " +
                      	(critico
                        	? "text-red-400"
                        	: bajo
                        	? "text-yellow-400"
                        	: "text-green-400")
                    	}
                  	>
                    	{queda}
                  	</td>
                  	<td className="p-4 text-right">
                    	<input
                      	type="number"
                      	min={0}
                      	value={stock[m].minimo}
                      	onChange={(e) =>
                        	set(m, "minimo", Number(e.target.value) || 0)
                      	}
                      	className="w-20 bg-[#0F1115] border border-white/10 rounded px-2 py-1.5 text-center"
                    	/>
                  	</td>
                	</tr>
              	);
            	})}
          	</tbody>
        	</table>
      	</div>

      	<div className="p-4 border-t border-white/10 flex justify-between items-center flex-wrap gap-3">
        	{savedAt ? (
          	<p className="text-xs text-green-400">Guardado a las {savedAt}</p>
        	) : (
          	<p className="text-xs text-gray-500">
            	Los cambios no se aplican hasta que guardes
          	</p>
        	)}
        	<button
          	onClick={guardar}
          	disabled={saving}
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-5 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
        	>
          	{saving ? (
            	<Loader2 className="animate-spin" size={16} />
          	) : (
            	<Save size={16} />
          	)}
          	Guardar stock
        	</button>
      	</div>
    	</div>

    	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mt-6">
      	<h2 className="font-bold mb-2 text-sm">Cómo se calcula la cola</h2>
      	<ul className="text-xs text-gray-400 space-y-1">
        	<li>
          	• Cada hoja A4 rinde <b className="text-gray-300">9 cartas</b>, y
          	las hojas se redondean hacia arriba: un pedido de 60 cartas ocupa 7
          	hojas, no 6,67.
        	</li>
        	<li>
          	• El <b className="text-gray-300">Matte Premium</b> comparte una
          	lámina de pouch cada dos hojas, así que gasta la mitad que el Matte
          	normal.
        	</li>
        	<li>
          	• La estimación es conservadora a propósito: para comprar conviene
          	que sobre y no que falte.
        	</li>
      	</ul>
    	</div>
  	</div>
	</main>
  );
}
