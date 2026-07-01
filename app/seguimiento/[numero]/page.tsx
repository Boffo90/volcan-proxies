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
} from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

type PedidoPublico = {
  numero: number;
  estado: string;
  created_at: string;
  total: number;
  tracking_numero?: string;
  tracking_courier?: string;
  fecha_envio?: string;
  historial?: Array<{ from: string; to: string; at: string }>;
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

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<section className="px-6 py-16 max-w-3xl mx-auto">
    	{loading ? (
      	<div className="flex justify-center py-20">
        	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
      	</div>
    	) : notFound ? (
      	<div className="text-center py-20">
        	<Package className="mx-auto text-gray-500 mb-4" size={48} />
        	<h1 className="text-2xl font-bold mb-2">Pedido no encontrado</h1>
        	<p className="text-gray-400">
          	Verifica el número o escríbenos a smyanezo@gmail.com
        	</p>
      	</div>
    	) : pedido ? (
      	<>
        	<div className="text-center mb-10">
          	<h1 className="text-3xl md:text-4xl font-bold mb-2">
            	Pedido{" "}
            	<span className="text-[#FF4D1A]">#{pedido.numero}</span>
          	</h1>
          	<p className="text-sm text-gray-400">
            	Realizado el{" "}
            	{new Date(pedido.created_at).toLocaleDateString("es-CL", {
              	day: "numeric",
              	month: "long",
              	year: "numeric",
            	})}
          	</p>
        	</div>

        	{pedido.tracking_numero && (
          	<div className="bg-gradient-to-r from-[#FF4D1A]/20 to-transparent border border-[#FF4D1A]/30 p-5 rounded-xl mb-8">
            	<h3 className="font-bold mb-2 flex items-center gap-2">
              	<Truck size={18} className="text-[#FF4D1A]" /> Tu paquete está
              	en camino
            	</h3>
            	<p className="text-sm mb-1">
              	<span className="text-gray-400">Courier: </span>
              	<b>
                	{COURIER_NAMES[pedido.tracking_courier || ""] ||
                  	pedido.tracking_courier}
              	</b>
            	</p>
            	<p className="text-sm mb-3">
              	<span className="text-gray-400">N° seguimiento: </span>
              	<b className="text-[#FF4D1A]">{pedido.tracking_numero}</b>
            	</p>
            	{(pedido.tracking_courier === "starken" ||
              	pedido.tracking_courier === "chilexpress" ||
              	pedido.tracking_courier === "bluexpress") && (
              	<button
                	onClick={openTracking}
                	className="inline-block bg-[#FF4D1A] hover:bg-[#e64418] px-4 py-2 rounded-lg text-sm font-semibold"
              	>
                	Rastrear en{" "}
                	{COURIER_NAMES[pedido.tracking_courier]} →
              	</button>
            	)}
          	</div>
        	)}

        	<div className="bg-[#1E242B] p-6 rounded-xl border border-white/10 mb-6">
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
                        	? "bg-[#FF4D1A] text-white"
                        	: isDone
                        	? "bg-[#FF4D1A]/20 text-[#FF4D1A]"
                        	: "bg-white/5 text-gray-500")
                    	}
                  	>
                    	<Icon size={18} />
                  	</div>
                  	<div className="flex-1">
                    	<p
                      	className={
                        	"font-semibold " +
                        	(isCurrent
                          	? "text-[#FF4D1A]"
                          	: isDone
                          	? "text-white"
                          	: "text-gray-500")
                      	}
                    	>
                      	{step.label}
                      	{isCurrent && (
                        	<span className="ml-2 text-xs bg-[#FF4D1A]/20 px-2 py-0.5 rounded-full">
                          	En proceso
                        	</span>
                      	)}
                    	</p>
                  	</div>
                  	{isDone && !isCurrent && (
                    	<CheckCircle2
                      	className="text-[#FF4D1A]"
                      	size={18}
                    	/>
                  	)}
                	</div>
              	);
            	})}
          	</div>
        	</div>

        	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mb-6">
          	<p className="text-sm text-gray-400 mb-1">Total del pedido</p>
          	<p className="text-2xl font-bold text-[#FF4D1A]">
            	{formatCLP(pedido.total)}
          	</p>
        	</div>

        	{pedido.historial && pedido.historial.length > 0 && (
          	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
            	<h3 className="font-bold mb-3 flex items-center gap-2">
              	<Clock size={16} /> Historial
            	</h3>
            	<div className="space-y-2">
              	{pedido.historial.map((h, idx) => (
                	<div
                  	key={idx}
                  	className="text-sm flex flex-wrap items-center gap-2 text-gray-300"
                	>
                  	<span className="text-xs text-gray-500">
                    	{new Date(h.at).toLocaleString("es-CL")}
                  	</span>
                  	<span className="capitalize">{h.from}</span>
                  	<span className="text-[#FF4D1A]">→</span>
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

