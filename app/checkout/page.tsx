"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CreditCard,
  Banknote,
  AlertCircle,
  Truck,
  MapPin,
} from "lucide-react";
import NavBar from "@/components/NavBar";
import { getCart, clearCart, type CartItem } from "@/lib/cart";
import {
  calculateTotalWith,
  formatCLP,
  MIN_CARDS,
  SHIPPING_COST,
} from "@/lib/pricing";
import { usePrecios } from "@/hooks/usePrecios";

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

type DeliveryType = "retiro" | "envio";

export default function CheckoutPage() {
  const router = useRouter();
  const { precios } = usePrecios();

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

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("envio");
  const [metodo, setMetodo] = useState<"flow" | "transferencia">(
	"transferencia"
  );
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
	setItems(getCart());
	setMounted(true);
  }, []);

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const cumpleMinimo = totalQty >= MIN_CARDS;
  const faltan = Math.max(0, MIN_CARDS - totalQty);

  const { total: subtotal, applied } = calculateTotalWith(
	precios,
	items.map((i) => ({
  	finish: i.finish,
  	quantity: i.quantity,
  	isCustom: i.isCustom,
	}))
  );

  const shippingCost = deliveryType === "envio" ? SHIPPING_COST : 0;
  const total = subtotal + shippingCost;

  const handleChange = (k: keyof FormData, v: string) => {
	setForm((f) => ({ ...f, v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();

	if (!cumpleMinimo) {
  	alert(`Pedido mínimo: ${MIN_CARDS} cartas. Te faltan ${faltan}.`);
  	return;
	}

	if (!aceptaTerminos) {
  	alert(
    	"Debes aceptar que entiendes que las cartas son proxies artesanales antes de continuar."
  	);
  	return;
	}

	setLoading(true);

	try {
  	const res = await fetch("/api/pedido", {
    	method: "POST",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({
      	...form,
      	items,
      	metodo,
      	total,
      	subtotal,
      	applied,
      	deliveryType,
      	shippingCost,
      	aceptaTerminos,
    	}),
  	});

  	const data = await res.json();

  	if (!res.ok) {
    	throw new Error(data.error || "Error al crear pedido");
  	}

  	if (metodo === "flow" && data.payment_url) {
    	clearCart();
    	window.location.href = data.payment_url;
    	return;
  	}

  	clearCart();
  	router.push(
    	"/gracias?pedido=" + data.numero + "&metodo=transferencia"
  	);
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

  const esRetiro = deliveryType === "retiro";

  const fields: Array<{
	k: keyof FormData;
	label: string;
	required?: boolean;
	type?: string;
	full?: boolean;
	hideOnRetiro?: boolean;
  }> = [
	{ k: "nombre", label: "Nombre completo *", required: true },
	{ k: "rut", label: "RUT" },
	{ k: "email", label: "Email *", required: true, type: "email" },
	{ k: "telefono", label: "Teléfono *", required: true },
	{
  	k: "direccion",
  	label: "Dirección *",
  	required: !esRetiro,
  	full: true,
  	hideOnRetiro: true,
	},
	{
  	k: "comuna",
  	label: "Comuna *",
  	required: !esRetiro,
  	hideOnRetiro: true,
	},
  ];

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<div className="max-w-5xl mx-auto px-6 py-10">
    	<h1 className="text-3xl md:text-4xl font-bold mb-8">
      	Finaliza tu <span className="text-[#FF4D1A]">pedido</span>
    	</h1>

    	{!cumpleMinimo && (
      	<div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl mb-6 flex gap-3">
        	<AlertCircle className="text-yellow-400 flex-shrink-0" size={20} />
        	<div>
          	<p className="text-sm font-semibold text-yellow-300">
            	Pedido mínimo: {MIN_CARDS} cartas.
          	</p>
          	<p className="text-xs text-yellow-200/80 mt-1">
            	Actualmente tienes {totalQty}. Te faltan {faltan} carta
            	{faltan !== 1 ? "s" : ""} para continuar.
          	</p>
        	</div>
      	</div>
    	)}

    	<form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
      	<div className="lg:col-span-2 space-y-6">
        	{/* TIPO DE ENTREGA */}
        	<section className="bg-[#1E242B] p-6 rounded-xl border border-white/10">
          	<h2 className="font-bold mb-4">Tipo de entrega</h2>

          	<div className="grid md:grid-cols-2 gap-3 mb-4">
            	<button
              	type="button"
              	onClick={() => setDeliveryType("envio")}
              	className={
                	"p-4 rounded-lg border transition flex items-start gap-3 text-left " +
                	(deliveryType === "envio"
                  	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                  	: "border-white/10")
              	}
            	>
              	<Truck className="text-[#FF4D1A] flex-shrink-0" />
              	<div>
                	<p className="font-semibold text-sm">Envío a domicilio</p>
                	<p className="text-xs text-gray-400 mt-1">
                  	Starken / Chilexpress / Blue Express
                	</p>
                	<p className="text-xs text-[#FF4D1A] mt-1 font-semibold">
                  	+ {formatCLP(SHIPPING_COST)}
                	</p>
              	</div>
            	</button>

            	<button
              	type="button"
              	onClick={() => setDeliveryType("retiro")}
              	className={
                	"p-4 rounded-lg border transition flex items-start gap-3 text-left " +
                	(deliveryType === "retiro"
                  	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                  	: "border-white/10")
              	}
            	>
              	<MapPin className="text-[#FF4D1A] flex-shrink-0" />
              	<div>
                	<p className="font-semibold text-sm">Retiro en Pucón</p>
                	<p className="text-xs text-gray-400 mt-1">
                  	Coordinamos por email o WhatsApp
                	</p>
                	<p className="text-xs text-green-400 mt-1 font-semibold">
                  	Sin costo adicional
                	</p>
              	</div>
            	</button>
          	</div>

          	{esRetiro && (
            	<div className="bg-[#0F1115] border border-white/10 rounded-lg p-3 text-xs text-gray-300">
              	📍 Al confirmar tu pedido, te contactaremos por email para
              	coordinar el retiro en Pucón centro.
            	</div>
          	)}

          	{!esRetiro && (
            	<div className="bg-[#0F1115] border border-white/10 rounded-lg p-3 text-xs text-gray-300">
              	🚚 Envío único de{" "}
              	<b className="text-white">{formatCLP(SHIPPING_COST)}</b> a
              	todo Chile. Despachamos en máximo 48 hrs vía Starken,
              	Chilexpress o Blue Express (elegimos el más rápido según tu
              	región).
            	</div>
          	)}
        	</section>

        	{/* DATOS DE ENVÍO */}
        	<section className="bg-[#1E242B] p-6 rounded-xl border border-white/10">
          	<h2 className="font-bold mb-4">
            	{esRetiro ? "Datos de contacto" : "Datos de envío"}
          	</h2>

          	<div className="grid md:grid-cols-2 gap-4">
            	{fields.map((f) => {
              	if (f.hideOnRetiro && esRetiro) return null;
              	return (
                	<div
                  	key={f.k}
                  	className={f.full ? "md:col-span-2" : ""}
                	>
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
              	);
            	})}

            	{!esRetiro && (
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
            	)}

            	<div className="md:col-span-2">
              	<label className="block text-xs text-gray-400 mb-1">
                	Notas (opcional)
              	</label>
              	<textarea
                	value={form.notas}
                	onChange={(e) => handleChange("notas", e.target.value)}
                	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 min-h-[80px]"
                	placeholder={
                  	esRetiro
                    	? "Ej: prefiero coordinar por WhatsApp"
                    	: "Ej: dejar en portería"
                	}
              	/>
            	</div>
          	</div>
        	</section>

        	{/* MÉTODO DE PAGO */}
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
                	<p className="text-xs text-gray-400">MACH / BCI</p>
              	</div>
            	</button>

            	<button
              	type="button"
              	onClick={() => setMetodo("flow")}
              	className={
                	"p-4 rounded-lg border transition flex items-center gap-3 " +
                	(metodo === "flow"
                  	? "border-[#FF4D1A] bg-[#FF4D1A]/10"
                  	: "border-white/10")
              	}
            	>
              	<CreditCard className="text-[#FF4D1A]" />
              	<div className="text-left">
                	<p className="font-semibold text-sm">Flow.cl</p>
                	<p className="text-xs text-gray-400">
                  	Tarjeta / Webpay / medios disponibles
                	</p>
              	</div>
            	</button>
          	</div>
        	</section>

        	{/* DISCLAIMER ARTESANAL */}
        	<section className="bg-[#1E242B] p-6 rounded-xl border border-white/10">
          	<h2 className="font-bold mb-4">Antes de continuar</h2>

          	<label className="flex items-start gap-3 cursor-pointer">
            	<input
              	type="checkbox"
              	checked={aceptaTerminos}
              	onChange={(e) => setAceptaTerminos(e.target.checked)}
              	className="mt-1 w-5 h-5 accent-[#FF4D1A] flex-shrink-0"
            	/>
            	<span className="text-sm text-gray-300 leading-relaxed">
              	Entiendo que{" "}
              	<b className="text-white">Volcán Proxies</b> son productos{" "}
              	<b className="text-[#FF4D1A]">artesanales</b> hechos a mano,
              	con cara de carta real impresa y laminada en calor. Tienen
              	la firmeza de una carta y se ven similares de lejos, pero{" "}
              	<b>no buscan ser indistinguibles de las cartas oficiales</b>{" "}
              	ni reemplazarlas en torneos sancionados.
            	</span>
          	</label>
        	</section>
      	</div>

      	{/* RESUMEN */}
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
          	<div className="flex justify-between text-sm mb-2">
            	<span className="text-gray-400">Cartas totales</span>
            	<span className={cumpleMinimo ? "" : "text-yellow-400"}>
              	{totalQty}
            	</span>
          	</div>

          	<p className="text-xs text-[#FF4D1A] mb-3">{applied}</p>

          	<div className="flex justify-between text-sm mb-2">
            	<span className="text-gray-400">Subtotal cartas</span>
            	<span>{formatCLP(subtotal)}</span>
          	</div>

          	<div className="flex justify-between text-sm mb-3">
            	<span className="text-gray-400">
              	{esRetiro ? "Retiro en Pucón" : "Envío"}
            	</span>
            	<span
              	className={esRetiro ? "text-green-400" : ""}
            	>
              	{esRetiro ? "Gratis" : formatCLP(SHIPPING_COST)}
            	</span>
          	</div>

          	<div className="flex justify-between items-center mb-4 border-t border-white/10 pt-3">
            	<span className="font-semibold">Total</span>
            	<span className="text-2xl font-bold text-[#FF4D1A]">
              	{formatCLP(total)}
            	</span>
          	</div>

          	<button
            	type="submit"
            	disabled={loading || !cumpleMinimo || !aceptaTerminos}
            	className="w-full bg-[#FF4D1A] hover:bg-[#e64418] py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          	>
            	{loading ? <Loader2 className="animate-spin" size={18} /> : null}
            	{!cumpleMinimo
              	? `Faltan ${faltan} carta${faltan !== 1 ? "s" : ""}`
              	: !aceptaTerminos
              	? "Debes aceptar los términos"
              	: metodo === "flow"
              	? "Pagar con Flow.cl"
              	: "Confirmar pedido"}
          	</button>

          	<p className="text-xs text-gray-500 text-center mt-4">
            	Flow.cl o transferencia
          	</p>
        	</div>
      	</aside>
    	</form>
  	</div>
	</main>
  );
}

