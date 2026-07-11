"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Save,
  Copy,
  Check,
  Truck,
  Trash2,
  MapPin,
} from "lucide-react";

type PedidoItem = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  finish: string;
  quantity: number;
  image: string;
  isCustom?: boolean;
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
  subtotal?: number;
  promo_aplicada?: string;
  estado: string;
  metodo_pago: string;
  notas?: string;
  admin_notas?: string;
  historial?: Array<{ from: string; to: string; at: string }>;
  items: PedidoItem[];
  created_at: string;
  tracking_numero?: string;
  tracking_courier?: string;
  fecha_envio?: string;
  delivery_type?: string;
  shipping_cost?: number;
  idioma?: string;
};

const ESTADOS = [
  "recibido",
  "pagado",
  "imprimiendo",
  "laminando",
  "enviado",
  "entregado",
];

type CourierKey = "starken" | "chilexpress" | "bluexpress" | "";

export default function AdminPedidoDetail() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adminNotas, setAdminNotas] = useState("");
  const [trackingNum, setTrackingNum] = useState("");
  const [trackingCourier, setTrackingCourier] = useState<CourierKey>("");
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
	setTrackingNum(data.pedido?.tracking_numero || "");
	setTrackingCourier((data.pedido?.tracking_courier as CourierKey) || "");
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

  const saveTracking = async () => {
	if (!trackingNum.trim() || !trackingCourier) {
  	alert("Ingresa courier y número de tracking");
  	return;
	}

	setSaving(true);

	const res = await fetch("/api/admin/pedido/" + id, {
  	method: "PATCH",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({
    	tracking_numero: trackingNum.trim(),
    	tracking_courier: trackingCourier,
    	fecha_envio: new Date().toISOString(),
    	estado: "enviado",
  	}),
	});

	if (res.ok) {
  	await fetchPedido();
  	alert("✅ Tracking guardado y email enviado al cliente");
	}

	setSaving(false);
  };

  const deletePedido = async () => {
	if (!pedido) return;

	const confirmDelete = window.confirm(
  	`Vas a eliminar el pedido #${pedido.numero} de ${pedido.cliente_nombre}.\n\nEsta acción no se puede deshacer.\n\n¿Quieres continuar?`
	);

	if (!confirmDelete) return;

	setDeleting(true);

	const res = await fetch("/api/admin/pedido/" + id, {
  	method: "DELETE",
	});

	if (!res.ok) {
  	const data = await res.json().catch(() => null);
  	alert(data?.error || "No se pudo eliminar el pedido");
  	setDeleting(false);
  	return;
	}

	alert("Pedido eliminado correctamente");
	router.push("/admin");
  };

  const formatCLP = (n: number) =>
	new Intl.NumberFormat("es-CL", {
  	style: "currency",
  	currency: "CLP",
  	maximumFractionDigits: 0,
	}).format(n);

  const mtgoList =
	pedido?.items
  	.map((it) => {
    	if (it.isCustom) {
      	return `${it.quantity} [CUSTOM] ${it.name} [${it.finish}]`;
    	}
    	return `${it.quantity} ${it.name} (${(it.set || "").toUpperCase()}) ${
      	it.collector_number
    	} [${it.finish}]`;
  	})
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

  const esRetiro = pedido.delivery_type === "retiro";

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
        	<div className="mt-2 flex items-center gap-2">
          	{esRetiro ? (
            	<span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded border border-green-500/20">
              	<MapPin size={12} /> Retiro en Pucón
            	</span>
          	) : (
            	<span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded border border-blue-500/20">
              	<Truck size={12} /> Envío a domicilio
            	</span>
          	)}
        	</div>
      	</div>

      	<div className="flex items-center gap-3 flex-wrap">
        	<div className="bg-[#1E242B] px-4 py-2 rounded-lg border border-white/10">
          	<p className="text-xs text-gray-400">Estado actual</p>
          	<p className="text-xl font-bold capitalize text-[#FF4D1A]">
            	{pedido.estado}
          	</p>
        	</div>

        	<button
          	onClick={deletePedido}
          	disabled={deleting}
          	className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
        	>
          	{deleting ? (
            	<Loader2 className="animate-spin" size={16} />
          	) : (
            	<Trash2 size={16} />
          	)}
          	Eliminar pedido
        	</button>
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

    	{!esRetiro && (
      	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mb-6">
        	<h2 className="font-bold mb-3 flex items-center gap-2">
          	<Truck size={18} className="text-[#FF4D1A]" /> Tracking de envío
        	</h2>
        	<p className="text-xs text-gray-400 mb-4">
          	Al guardar, se enviará automáticamente un email al cliente con el
          	número de seguimiento.
        	</p>

        	<div className="grid md:grid-cols-2 gap-3 mb-3">
          	<div>
            	<label className="block text-xs text-gray-400 mb-1">
              	Courier
            	</label>
            	<select
              	value={trackingCourier}
              	onChange={(e) =>
                	setTrackingCourier(e.target.value as CourierKey)
              	}
              	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2"
            	>
              	<option value="">Elige courier</option>
              	<option value="starken">Starken</option>
              	<option value="chilexpress">Chilexpress</option>
              	<option value="bluexpress">Blue Express</option>
            	</select>
          	</div>

          	<div>
            	<label className="block text-xs text-gray-400 mb-1">
              	N° seguimiento
            	</label>
            	<input
              	value={trackingNum}
              	onChange={(e) => setTrackingNum(e.target.value)}
              	placeholder="Ej: 1234567890"
              	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2"
            	/>
          	</div>
        	</div>

        	<button
          	onClick={saveTracking}
          	disabled={saving}
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
        	>
          	{saving ? (
            	<Loader2 className="animate-spin" size={14} />
          	) : (
            	<Save size={14} />
          	)}
          	Guardar tracking y enviar email
        	</button>

        	{pedido.tracking_numero && (
          	<p className="mt-3 text-xs text-green-400">
            	✓ Tracking guardado: {pedido.tracking_courier} ·{" "}
            	{pedido.tracking_numero}
          	</p>
        	)}
      	</div>
    	)}

    	{esRetiro && (
      	<div className="bg-green-500/10 border border-green-500/30 p-5 rounded-xl mb-6">
        	<h2 className="font-bold mb-2 flex items-center gap-2 text-green-300">
          	<MapPin size={18} /> Retiro en Pucón
        	</h2>
        	<p className="text-sm text-green-200/80">
          	Este pedido es de retiro presencial. Coordina con el cliente por
          	email o WhatsApp. No requiere tracking de courier.
        	</p>
      	</div>
    	)}

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
        	<p className="text-sm text-gray-400">Idioma de las cartas</p>
        	<p className="mb-3">{pedido.idioma || "Inglés"}</p>
        	<p className="text-sm text-gray-400">Promo aplicada</p>
        	<p className="mb-3">{pedido.promo_aplicada || "-"}</p>
        	{pedido.subtotal !== undefined && (
          	<>
            	<p className="text-sm text-gray-400">Subtotal cartas</p>
            	<p className="mb-2 text-sm">{formatCLP(pedido.subtotal)}</p>
          	</>
        	)}
        	{pedido.shipping_cost !== undefined && pedido.shipping_cost > 0 && (
          	<>
            	<p className="text-sm text-gray-400">Envío</p>
            	<p className="mb-2 text-sm">
              	{formatCLP(pedido.shipping_cost)}
            	</p>
          	</>
        	)}
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


