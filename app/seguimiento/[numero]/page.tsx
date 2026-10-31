"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Package,
  CheckCircle2,
  Truck,
  Printer,
  Layers,
  Home,
  Clock,
  CreditCard,
} from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";

type PedidoPublico = {
  numero: number;
  estado: string;
  created_at: string;
  total: number;
  tracking_numero?: string;
  tracking_courier?: string;
  fecha_envio?: string;
  historial?: Array<{ from: string; to: string; at: string }>;
  metodo_pago?: string;
};

const TIMELINE = [
  { key: "recibido", label: "Recibido", icon: Package },
  { key: "pagado", label: "Pago confirmado", icon: CheckCircle2 },
  { key: "imprimiendo", label: "Imprimiendo", icon: Printer },
  { key: "laminando", label: "Laminando", icon: Layers },
  { key: "enviado", label: "Enviado", icon: Truck },
  { key: "entregado", label: "Entregado", icon: Home },
];

const COURIER_NAMES: Record<string, string> = {
  starken: "Starken",
  chilexpress: "Chilexpress",
  bluexpress: "Blue Express",
};

export default function SeguimientoPage() {
  const { numero } = useParams<{ numero: string }>();
  const [pedido, setPedido] = useState<PedidoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
	(async () => {
  	const res = await fetch("/api/seguimiento/" + numero);
  	if (res.status === 404) {
    	setNotFound(true);
    	setLoading(false);
    	return;
  	}
  	const data = await res.json();
  	setPedido(data.pedido);
  	setLoading(false);
	})();
  }, [numero]);

  const formatCLP = (n: number) =>
	new Intl.NumberFormat("es-CL", {
  	style: "currency",
  	currency: "CLP",
  	maximumFractionDigits: 0,
	}).format(n);

  const currentIdx = pedido
	? TIMELINE.findIndex((t) => t.key === pedido.estado)
	: -1;

  const openTracking = () => {
	if (!pedido?.tracking_numero || !pedido.tracking_courier) return;
	let url = "";
	if (pedido.tracking_courier === "starken") {
  	url =
    	"https://www.starken.cl/seguimiento?codigo=" + pedido.tracking_numero;
	} else if (pedido.tracking_courier === "chilexpress") {
  	url =
    	"https://www.chilexpress.cl/Views/ChilexpressCL/Seguimiento.aspx?TrackingNumber=" +
    	pedido.tracking_numero;
	} else if (pedido.tracking_courier === "bluexpress") {
  	url =
    	"https://www.blue.cl/seguimiento/?n_seguimiento=" +
    	pedido.tracking_numero;
	}
	if (url) window.open(url, "_blank");
  };

  const sinPagar = pedido?.estado === "recibido";

  const reintentarPago = async () => {
	setPagando(true);
	try {
  	const res = await fetch("/api/pedido/pagar", {
    	method: "POST",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ numero: pedido?.numero }),
  	});
  	const data = await res.json();
  	if (data.payment_url) {
    	window.location.href = data.payment_url;
    	return;
  	}
  	alert(data.error || "No se pudo generar el link de pago.");
	} catch {
  	alert("No se pudo generar el link de pago. Intenta de nuevo.");
	} finally {
  	setPagando(false);
	}
  };

  return (
	<main className="min-h-screen bg-surface text-ink-soft">
  	<NavBar />

  	<section className="px-6 py-16 max-w-3xl mx-auto">
    	{loading ? (
      	<div className="flex justify-center py-20">
        	<Loader2 className="animate-spin text-flame-ink" size={32} />
      	</div>
    	) : notFound ? (
      	<div className="text-center py-20">
        	<Package className="mx-auto text-ink-faint mb-4" size={48} />
        	<h1 className="text-2xl font-bold mb-2">Pedido no encontrado</h1>
        	<p className="text-ink-muted">
          	Verifica el número o escríbenos a volcanproxies@gmail.com
        	</p>
      	</div>
    	) : pedido ? (
      	<>
        	<Reveal className="text-center mb-10">
          	<h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2">
            	Pedido{" "}
            	<span className="text-lava">#{pedido.numero}</span>
          	</h1>
          	<p className="text-sm text-ink-muted">
            	Realizado el{" "}
            	{new Date(pedido.created_at).toLocaleDateString("es-CL", {
              	day: "numeric",
              	month: "long",
              	year: "numeric",
            	})}
          	</p>
        	</Reveal>

        	{sinPagar && (
          	<div className="bg-yellow-500/10 border border-amber-700/35 p-5 rounded-xl mb-8">
            	<h3 className="font-bold mb-1 flex items-center gap-2 text-amber-700">
              	<CreditCard size={18} /> Este pedido está sin pagar
            	</h3>
            	<p className="text-sm text-amber-700 mb-4">
              	Lo tenemos guardado completo. Empieza a producirse en cuanto
              	recibamos el pago.
            	</p>
            	<button
              	onClick={reintentarPago}
              	disabled={pagando}
              	className="btn-flame px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 transition-all"
            	>
              	{pagando ? (
                	<Loader2 className="animate-spin" size={18} />
              	) : (
                	<CreditCard size={18} />
              	)}
              	Pagar ahora
            	</button>
            	<p className="text-xs text-amber-700 mt-3">
              	¿Prefieres transferencia? Escríbenos a volcanproxies@gmail.com
              	indicando tu pedido #{pedido.numero}.
            	</p>
          	</div>
        	)}

        	{pedido.tracking_numero && (
          	<div className="bg-gradient-to-r from-flame-tint to-transparent border border-flame/50 p-5 rounded-xl mb-8">
            	<h3 className="font-bold mb-2 flex items-center gap-2">
              	<Truck size={18} className="text-flame-ink" /> Tu paquete está
              	en camino
            	</h3>
            	<p className="text-sm mb-1">
              	<span className="text-ink-muted">Courier: </span>
              	<b>
                	{COURIER_NAMES[pedido.tracking_courier || ""] ||
                  	pedido.tracking_courier}
              	</b>
            	</p>
            	<p className="text-sm mb-3">
              	<span className="text-ink-muted">N° seguimiento: </span>
              	<b className="text-flame-ink">{pedido.tracking_numero}</b>
            	</p>
            	{(pedido.tracking_courier === "starken" ||
              	pedido.tracking_courier === "chilexpress" ||
              	pedido.tracking_courier === "bluexpress") && (
              	<button
                	onClick={openTracking}
                	className="inline-block btn-flame px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              	>
                	Rastrear en{" "}
                	{COURIER_NAMES[pedido.tracking_courier]} →
              	</button>
            	)}
          	</div>
        	)}

        	<div className="glass-card p-6 rounded-xl mb-6">
          	<h3 className="font-bold mb-6">Estado del pedido</h3>
          	<div className="space-y-1">
            	{TIMELINE.map((step, idx) => {
              	const Icon = step.icon;
              	const isDone = idx <= currentIdx;
              	const isCurrent = idx === currentIdx;
              	return (
                	<div
                  	key={step.key}
                  	className="flex items-center gap-4 py-2"
                	>
                  	<div
                    	className={
                      	"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition " +
                      	(isCurrent
                        	? "bg-flame text-white"
                        	: isDone
                        	? "bg-flame-tint text-flame-ink"
                        	: "bg-ink/5 text-ink-faint")
                    	}
                  	>
                    	<Icon size={18} />
                  	</div>
                  	<div className="flex-1">
                    	<p
                      	className={
                        	"font-semibold " +
                        	(isCurrent
                          	? "text-flame-ink"
                          	: isDone
                          	? "text-ink"
                          	: "text-ink-faint")
                      	}
                    	>
                      	{step.label}
                      	{isCurrent && (
                        	<span className="ml-2 text-xs bg-flame-tint px-2 py-0.5 rounded-full">
                          	En proceso
                        	</span>
                      	)}
                    	</p>
                  	</div>
                  	{isDone && !isCurrent && (
                    	<CheckCircle2
                      	className="text-flame-ink"
                      	size={18}
                    	/>
                  	)}
                	</div>
              	);
            	})}
          	</div>
        	</div>

        	<div className="glass-card p-5 rounded-xl mb-6">
          	<p className="text-sm text-ink-muted mb-1">Total del pedido</p>
          	<p className="text-2xl font-display font-bold text-lava">
            	{formatCLP(pedido.total)}
          	</p>
        	</div>

        	{pedido.historial && pedido.historial.length > 0 && (
          	<div className="glass-card p-5 rounded-xl">
            	<h3 className="font-bold mb-3 flex items-center gap-2">
              	<Clock size={16} /> Historial
            	</h3>
            	<div className="space-y-2">
              	{pedido.historial.map((h, idx) => (
                	<div
                  	key={idx}
                  	className="text-sm flex flex-wrap items-center gap-2 text-ink-soft"
                	>
                  	<span className="text-xs text-ink-faint">
                    	{new Date(h.at).toLocaleString("es-CL")}
                  	</span>
                  	<span className="capitalize">{h.from}</span>
                  	<span className="text-flame-ink">→</span>
                  	<span className="capitalize">{h.to}</span>
                	</div>
              	))}
            	</div>
          	</div>
        	)}
      	</>
    	) : null}
  	</section>

  	<Footer />
	</main>
  );
}

