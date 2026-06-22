"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Copy, Check } from "lucide-react";

type PedidoItem = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  finish: string;
  quantity: number;
  image: string;
};

type Pedido = {
  id: string;
  numero: number;
  cliente_nombre: string;
  cliente_rut?: string;
  cliente_email: string;
  cliente_telefono?: string;
  direccion: string;
  comuna: string;
  region: string;
  total: number;
  promo_aplicada?: string;
  estado: string;
  metodo_pago: string;
  notas?: string;
  admin_notas?: string;
  historial?: Array<{ from: string; to: string; at: string }>;
  items: PedidoItem[];
  created_at: string;
};

const ESTADOS = [
  "recibido",
  "pagado",
  "imprimiendo",
  "laminando",
  "enviado",
  "entregado",
];

export default function AdminPedidoDetail() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminNotas, setAdminNotas] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchPedido = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/pedido/" + id);
	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}
	const data = await res.json();
	setPedido(data.pedido);
	setAdminNotas(data.pedido?.admin_notas || "");
	setLoading(false);
  }, [id, router]);

  useEffect(() => {
	if (id) fetchPedido();
  }, [id, fetchPedido]);

  const updateEstado = async (nuevoEstado: string) => {
	setSaving(true);
	const res = await fetch("/api/admin/pedido/" + id, {
  	method: "PATCH",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({ estado: nuevoEstado }),
	});
	if (res.ok) await fetchPedido();
	setSaving(false);
  };

  const saveNotas = async () => {
	setSaving(true);
	await fetch("/api/admin/pedido/" + id, {
  	method: "PATCH",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({ admin_notas: adminNotas }),
	});
	setSaving(false);
  };

  const formatCLP = (n: number) =>
	new Intl.NumberFormat("es-CL", {
  	style: "currency",
  	currency: "CLP",
  	maximumFractionDigits: 0,
	}).format(n);

  const mtgoList =
	pedido?.items
  	.map(
    	(it) =>
      	`${it.quantity} ${it.name} (${(it.set || "").toUpperCase()}) ${it.collector_number} [${it.finish}]`
  	)
  	.join("\n") || "";

  const copyMtgo = async () => {
	await navigator.clipboard.writeText(mtgoList);
	setCopied(true);
	setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white flex justify-center py-32">
    	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
  	</main>
	);
  }

  if (!pedido) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white flex justify-center py-32">
    	<p>Pedido no encontrado</p>
  	</main>
	);
  }

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<div className="max-w-5xl mx-auto px-6 py-6">
    	<button
      	onClick={() => router.push("/admin")}
      	className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al panel
    	</button>

    	<div className="flex items-start justify-between mb-6 flex-wrap gap-4">
      	<div>
        	<h1 className="text-3xl font-bold">
          	Pedido <span className="text-[#FF4D1A]">#{pedido.numero}</span>
        	</h1>
        	<p className="text-sm text-gray-400 mt-1">
          	{new Date(pedido.created_at).toLocaleString("es-CL")}
        	</p>
      	</div>
      	<div className="bg-[#1E242B] px-4 py-2 rounded-lg border border-white/10">
        	<p className="text-xs text-gray-400">Estado actual</p>
        	<p className="text-xl font-bold capitalize text-[#FF4D1A]">
          	{pedido.estado}
        	</p>
      	</div>
    	</div>

    	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mb-6">
      	<h2 className="font-bold mb-3">Avanzar pedido</h2>
      	<div className="flex flex-wrap gap-2">
        	{ESTADOS.map((e) => {
          	const isCurrent = e === pedido.estado;
          	return (
            	<button
              	key={e}
              	onClick={() => !isCurrent && updateEstado(e)}
              	disabled={isCurrent || saving}
              	className={
                	"px-3 py-2 rounded-lg text-sm capitalize transition " +
                	(isCurrent
                  	? "bg-[#FF4D1A] text-white"
                  	: "bg-[#0F1115] border border-white/10 hover:border-[#FF4D1A]")
              	}
            	>
              	{e}
            	</button>
          	);
        	})}
      	</div>
    	</div>

    	<div className="grid lg:grid-cols-2 gap-6">
      	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
        	<h2 className="font-bold mb-3">Cliente</h2>
        	<p className="mb-1">
          	<b>{pedido.cliente_nombre}</b>{" "}
          	{pedido.cliente_rut ? `(${pedido.cliente_rut})` : ""}
        	</p>
        	<p className="text-sm text-gray-300 mb-1">
          	📧 {pedido.cliente_email}
        	</p>
        	<p className="text-sm text-gray-300 mb-3">
          	📱 {pedido.cliente_telefono || "-"}
        	</p>
        	<p className="text-sm text-gray-300">
          	📍 {pedido.direccion}, {pedido.comuna}, {pedido.region}
        	</p>
        	{pedido.notas ? (
          	<p className="text-sm text-gray-400 mt-3 italic">
            	Notas cliente: {pedido.notas}
          	</p>
        	) : null}
      	</div>

      	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
        	<h2 className="font-bold mb-3">Pago</h2>
        	<p className="text-sm text-gray-400">Método</p>
        	<p className="mb-3 capitalize">{pedido.metodo_pago}</p>
        	<p className="text-sm text-gray-400">Promo aplicada</p>
        	<p className="mb-3">{pedido.promo_aplicada || "-"}</p>
        	<p className="text-sm text-gray-400">Total</p>
        	<p className="text-2xl font-bold text-[#FF4D1A]">
          	{formatCLP(pedido.total)}
        	</p>
      	</div>
    	</div>

    	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mt-6">
      	<div className="flex justify-between items-center mb-3">
        	<h2 className="font-bold">Lista para imprimir (formato MTGO)</h2>
        	<button
          	onClick={copyMtgo}
          	className="bg-[#0F1115] hover:bg-white/5 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-white/10"
        	>
          	{copied ? <Check size={14} /> : <Copy size={14} />}
          	{copied ? "Copiado!" : "Copiar"}
        	</button>
      	</div>
      	<pre className="bg-[#0F1115] text-[#FF4D1A] p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">
{mtgoList}
      	</pre>
    	</div>

    	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mt-6">
      	<h2 className="font-bold mb-3">
        	Cartas ({pedido.items.length} items)
      	</h2>
      	<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        	{pedido.items.map((it, idx) => (
          	<div
            	key={idx}
            	className="bg-[#0F1115] rounded-lg p-2 border border-white/5"
          	>
            	<div
              	role="img"
              	aria-label={it.name}
              	className="w-full aspect-[5/7] rounded mb-2 bg-[#1E242B] bg-center bg-cover bg-no-repeat"
              	style={{ backgroundImage: `url(${it.image})` }}
            	/>
            	<p className="text-xs font-semibold truncate">{it.name}</p>
            	<p className="text-[10px] text-gray-400 truncate">
              	{it.set_name}
            	</p>
            	<p className="text-[10px] text-[#FF4D1A]">
              	{it.quantity}× {it.finish}
            	</p>
          	</div>
        	))}
      	</div>
    	</div>

    	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mt-6">
      	<h2 className="font-bold mb-3">Notas internas (admin)</h2>
      	<textarea
        	value={adminNotas}
        	onChange={(e) => setAdminNotas(e.target.value)}
        	placeholder="Ej: cliente pagó por MACH a las 15:30, verificado..."
        	className="w-full bg-[#0F1115] border border-white/10 rounded-lg p-3 text-sm min-h-[120px]"
      	/>
      	<button
        	onClick={saveNotas}
        	disabled={saving}
        	className="mt-3 bg-[#FF4D1A] hover:bg-[#e64418] px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
      	>
        	{saving ? (
          	<Loader2 className="animate-spin" size={14} />
        	) : (
          	<Save size={14} />
        	)}
        	Guardar notas
      	</button>
    	</div>

    	{pedido.historial && pedido.historial.length > 0 ? (
      	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mt-6">
        	<h2 className="font-bold mb-3">Historial de cambios</h2>
        	<div className="space-y-2">
          	{pedido.historial.map((h, idx) => (
            	<div
              	key={idx}
              	className="text-sm flex items-center gap-3 text-gray-300"
            	>
              	<span className="text-xs text-gray-500 w-40">
                	{new Date(h.at).toLocaleString("es-CL")}
              	</span>
              	<span className="capitalize">{h.from}</span>
              	<span className="text-[#FF4D1A]">→</span>
              	<span className="capitalize">{h.to}</span>
            	</div>
          	))}
        	</div>
      	</div>
    	) : null}
  	</div>
	</main>
  );
}

