"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, Banknote } from "lucide-react";
import NavBar from "@/components/NavBar";
import { getCart, clearCart, type CartItem } from "@/lib/cart";
import { calculateTotal, formatCLP } from "@/lib/pricing";

const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
];

type FormData = {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  comuna: string;
  region: string;
  notas: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState<FormData>({
	nombre: "",
	rut: "",
	email: "",
	telefono: "",
	direccion: "",
	comuna: "",
	region: "Araucanía",
	notas: "",
  });
  const [metodo, setMetodo] = useState<"mp" | "transferencia">("transferencia");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
	setItems(getCart());
	setMounted(true);
  }, []);

  const { total, applied } = calculateTotal(
	items.map((i) => ({ finish: i.finish, quantity: i.quantity }))
  );

  const handleChange = (k: keyof FormData, v: string) =>
	setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();
	setLoading(true);
	try {
  	const res = await fetch("/api/pedido", {
    	method: "POST",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ ...form, items, metodo, total, applied }),
  	});
  	const data = await res.json();
  	if (!res.ok) throw new Error(data.error || "Error al crear pedido");

  	if (metodo === "mp" && data.init_point) {
    	clearCart();
    	window.location.href = data.init_point;
  	} else {
    	clearCart();
    	router.push(
      	"/gracias?pedido=" + data.numero + "&metodo=transferencia"
    	);
  	}
	} catch (err: unknown) {
  	const msg = err instanceof Error ? err.message : "Error";
  	alert("Error: " + msg);
  	setLoading(false);
	}
  };

  if (!mounted) return null;

  if (items.length === 0) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white">
    	<NavBar />
    	<div className="text-center py-32">
      	<p className="text-gray-400 mb-6">Tu carrito está vacío.</p>
      	<button
        	onClick={() => router.push("/catalogo")}
        	className="bg-[#FF4D1A] hover:bg-[#e64418] px-6 py-3 rounded-lg font-semibold transition"
      	>
        	Ir al catálogo
      	</button>
    	</div>
  	</main>
	);
  }

  const inputClass =
	"w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2";

  const fields: Array<{
	k: keyof FormData;
	label: string;
	required?: boolean;
	type?: string;
	full?: boolean;
  }> = [
	{ k: "nombre", label: "Nombre completo *", required: true },
	{ k: "rut", label: "RUT" },
	{ k: "email", label: "Email *", required: true, type: "email" },
	{ k: "telefono", label: "Teléfono *", required: true },
	{ k: "direccion", label: "Dirección *", required: true, full: true },
	{ k: "comuna", label: "Comuna *", required: true },
  ];

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<div className="max-w-5xl mx-auto px-6 py-10">
    	<h1 className="text-3xl md:text-4xl font-bold mb-8">
      	Finaliza tu <span className="text-[#FF4D1A]">pedido</span>
    	</h1>

    	<form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
      	<div className="lg:col-span-2 space-y-6">
        	<section className="bg-[#1E242B] p-6 rounded-xl border border-white/10">
          	<h2 className="font-bold mb-4">Datos de envío</h2>
          	<div className="grid md:grid-cols-2 gap-4">
            	{fields.map((f) => (
              	<div key={f.k} className={f.full ? "md:col-span-2" : ""}>
                	<label className="block text-xs text-gray-400 mb-1">
                  	{f.label}
                	</label>
                	<input
                  	type={f.type || "text"}
                  	required={f.required}
                  	value={form[f.k]}
                  	onChange={(e) => handleChange(f.k, e.target.value)}
                  	className={inputClass}
                	/>
              	</div>
            	))}
            	<div>
              	<label className="block text-xs text-gray-400 mb-1">
                	Región *
              	</label>
              	<select
                	required
                	value={form.region}
                	onChange={(e) => handleChange("region", e.target.value)}
                	className={inputClass}
              	>
                	{REGIONES.map((r) => (
                  	<option key={r} value={r}>
                    	{r}
                  	</option>
                	))}
              	</select>
            	</div>
            	<div className="md:col-span-2">
              	<label className="block text-xs text-gray-400 mb-1">
                	Notas (opcional)
              	</label>
              	<textarea
                	value={form.notas}
                	onChange={(e) => handleChange("notas", e.target.value)}
                	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 min-h-[80px]"
                	placeholder="Ej: prefiero retiro en Pucón centro"
              	/>
            	</div>
          	</div>
          	<p className="text-xs text-gray-500 mt-3">
            	Envío por Starken/Chilexpress por pagar al recibir.
          	</p>
        	</section>

        	<section className="bg-[#1E242B] p-6 rounded-xl border border-white/10">
          	<h2 className="font-bold mb-4">Método de pago</h2>
          	<div className="grid md:grid-cols-2 gap-3">
            	<button
              	type="button"
              	onClick={() => setMetodo("transferencia")}
              	className={
                	"p-4 rounded-lg border transition flex items-center gap-3 " +
                	(metodo === "transferencia"
                  	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                  	: "border-white/10")
              	}
            	>
              	<Banknote className="text-[#FF4D1A]" />
              	<div className="text-left">
                	<p className="font-semibold text-sm">Transferencia</p>
                	<p className="text-xs text-gray-400">MACH BCI</p>
              	</div>
            	</button>
            	<button
              	type="button"
              	onClick={() => setMetodo("mp")}
              	className={
                	"p-4 rounded-lg border transition flex items-center gap-3 " +
                	(metodo === "mp"
                  	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                  	: "border-white/10")
              	}
            	>
              	<CreditCard className="text-[#FF4D1A]" />
              	<div className="text-left">
                	<p className="font-semibold text-sm">Mercado Pago</p>
                	<p className="text-xs text-gray-400">
                  	Tarjeta crédito/débito
                	</p>
              	</div>
            	</button>
          	</div>
        	</section>
      	</div>

      	<aside className="bg-[#1E242B] p-6 rounded-xl border border-white/10 h-fit sticky top-24">
        	<h2 className="font-bold mb-4">Resumen</h2>
        	<div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          	{items.map((it, idx) => (
            	<div
              	key={it.id + "-" + it.finish + "-" + idx}
              	className="flex justify-between text-sm"
            	>
              	<span className="truncate pr-2">
                	{it.quantity}× {it.name}
              	</span>
              	<span className="text-gray-400 capitalize text-xs">
                	{it.finish}
              	</span>
            	</div>
          	))}
        	</div>
        	<div className="border-t border-white/10 pt-4">
          	<p className="text-xs text-[#FF4D1A] mb-2">{applied}</p>
          	<div className="flex justify-between items-center mb-4">
            	<span>Total</span>
            	<span className="text-2xl font-bold text-[#FF4D1A]">
              	{formatCLP(total)}
            	</span>
          	</div>
          	<button
            	type="submit"
            	disabled={loading}
            	className="w-full bg-[#FF4D1A] hover:bg-[#e64418] py-3 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          	>
            	{loading ? <Loader2 className="animate-spin" size={18} /> : null}
            	Confirmar pedido
          	</button>
        	</div>
      	</aside>
    	</form>
  	</div>
	</main>
  );
}

