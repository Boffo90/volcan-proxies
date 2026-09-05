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
  Download,
  Mail,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Package,
  Pencil,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { REGIONES } from "@/lib/envio";

type PedidoItem = {
  id: string;
  /** Juego del que viene la carta. Los pedidos viejos no lo traen: son MTG. */
  juego?: string;
  /** Idioma de esta carta. Los pedidos viejos no lo traen: son inglés. */
  idioma?: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  finish: string;
  quantity: number;
  image: string;
  isCustom?: boolean;
  /** ID de la imagen en MPCFill (file-id de Drive) cuando el cliente eligió un arte HD. */
  mpcfillId?: string;
  /** Dorso personalizado que pidió el cliente, si lo hay. */
  dorsoUrl?: string;
  dorsoNombre?: string;
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
  /** Cuándo se le avisó al cliente que su pago quedó confirmado. */
  confirmacion_enviada_at?: string;
  /** Cuándo se archivó. Los archivados salen del panel pero no se borran. */
  archivado_at?: string | null;
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

/** Otro pedido del mismo cliente que va en el mismo paquete. */
type PedidoAgrupable = {
  id: string;
  numero: number;
  estado: string;
  total: number;
  created_at: string;
};

/** Respuesta de la verificación contra Flow (estado real del pago). */
type FlowEstado = {
  aplica: boolean;
  status?: number;
  etiqueta?: string;
  pagado?: boolean;
  monto?: number;
  pagador?: string | null;
  flowOrder?: number | null;
  error?: string;
};

// Estados que implican que el pedido ya se está trabajando o despachando: si
// el pago no está confirmado en Flow, aquí es donde se pierde plata.
const ESTADOS_QUE_ASUMEN_PAGO = [
  "pagado",
  "imprimiendo",
  "laminando",
  "enviado",
  "entregado",
];

function xmlEscape(s: string): string {
  return s
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;");
}

/**
* Genera un XML de orden MPCFill (formato mpc-autofill) con las cartas cuyo
* arte HD eligió el cliente en MPCFill. Cada <card> lleva el <id> (file-id de
* Drive) del diseño exacto. Se importa en Cardwright con el botón "MPC XML…".
*/
function buildMpcfillXml(items: PedidoItem[]): string {
  let slot = 0;
  const total = items.reduce((s, it) => s + it.quantity, 0);

  const cards = items
	.map((it) => {
  	const slots: number[] = [];
  	for (let i = 0; i < it.quantity; i++) slots.push(slot++);
  	// Cara frontal para el query (MPCFill busca por nombre en minúsculas).
  	const front = it.name.split(" // ")[0].trim();
  	return [
    	"	<card>",
    	`  	<id>${xmlEscape(it.mpcfillId || "")}</id>`,
    	`  	<slots>${slots.join(",")}</slots>`,
    	`  	<name>${xmlEscape(front)}.png</name>`,
    	`  	<query>${xmlEscape(front.toLowerCase())}</query>`,
    	"	</card>",
  	].join("\n");
	})
	.join("\n");

  return [
	"<order>",
	"  <details>",
	`	<quantity>${total}</quantity>`,
	"	<stock>(S30) Standard Smooth</stock>",
	"	<foil>false</foil>",
	"  </details>",
	"  <fronts>",
	cards,
	"  </fronts>",
	"</order>",
  ].join("\n");
}

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
  const [copiedDeck, setCopiedDeck] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [flowEstado, setFlowEstado] = useState<FlowEstado | null>(null);
  const [verificandoFlow, setVerificandoFlow] = useState(false);
  const [agrupables, setAgrupables] = useState<PedidoAgrupable[]>([]);
  const [editandoEnvio, setEditandoEnvio] = useState(false);
  const [envioForm, setEnvioForm] = useState({
	cliente_nombre: "",
	cliente_telefono: "",
	direccion: "",
	comuna: "",
	region: "",
  });

  const fetchPedido = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/pedido/" + id);

	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}

	const data = await res.json();

	setPedido(data.pedido);
	setAgrupables(data.agrupables || []);
	setAdminNotas(data.pedido?.admin_notas || "");
	setTrackingNum(data.pedido?.tracking_numero || "");
	setTrackingCourier((data.pedido?.tracking_courier as CourierKey) || "");
	setLoading(false);
  }, [id, router]);

  const verificarFlow = useCallback(async () => {
	setVerificandoFlow(true);
	try {
  	const res = await fetch("/api/admin/pedido/" + id + "/flow");
  	if (res.ok) setFlowEstado(await res.json());
	} catch {
  	// sin conexión: el panel muestra el aviso de "no verificado"
	} finally {
  	setVerificandoFlow(false);
	}
  }, [id]);

  useEffect(() => {
	if (id) fetchPedido();
  }, [id, fetchPedido]);

  // Verificar el pago apenas se abre un pedido de Flow: el estado guardado
  // puede mentir (webhook que no llegó, o alguien que lo avanzó a mano).
  useEffect(() => {
	if (pedido?.metodo_pago === "flow") verificarFlow();
  }, [pedido?.metodo_pago, verificarFlow]);

  const updateEstado = async (nuevoEstado: string) => {
	// Avanzar un pedido de Flow a un estado que asume el pago, cuando Flow
	// dice que no está pagado, es exactamente cómo se termina produciendo un
	// pedido impago. Se puede seguir, pero no en silencio.
	if (
  	pedido?.metodo_pago === "flow" &&
  	ESTADOS_QUE_ASUMEN_PAGO.includes(nuevoEstado) &&
  	flowEstado?.aplica &&
  	!flowEstado.error &&
  	!flowEstado.pagado
	) {
  	if (
    	!confirm(
      	"🚨 Flow dice que este pedido NO está pagado (" +
        	flowEstado.etiqueta +
        	").\n\n¿Igual quieres moverlo a \"" +
        	nuevoEstado +
        	'"?\n\nSolo hazlo si comprobaste el pago por otra vía.'
    	)
  	) {
    	return;
  	}
	}

	setSaving(true);

	const res = await fetch("/api/admin/pedido/" + id, {
  	method: "PATCH",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({ estado: nuevoEstado }),
	});

	if (res.ok) await fetchPedido();

	setSaving(false);
  };

  const abrirEdicionEnvio = () => {
	if (!pedido) return;
	setEnvioForm({
  	cliente_nombre: pedido.cliente_nombre || "",
  	cliente_telefono: pedido.cliente_telefono || "",
  	direccion: pedido.direccion || "",
  	comuna: pedido.comuna || "",
  	region: pedido.region || "Araucanía",
	});
	setEditandoEnvio(true);
  };

  const guardarEnvio = async () => {
	setSaving(true);
	try {
  	const res = await fetch("/api/admin/pedido/" + id, {
    	method: "PATCH",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ envio: envioForm }),
  	});
  	const data = await res.json();
  	if (!res.ok) {
    	alert("No se pudo guardar: " + (data.error || "error desconocido"));
    	return;
  	}
  	setEditandoEnvio(false);
  	await fetchPedido();
	} finally {
  	setSaving(false);
	}
  };

  const cambiarMetodoPago = async (metodo: string) => {
	const etiqueta = metodo === "flow" ? "Flow.cl" : "Transferencia";
	if (
  	!confirm(
    	"¿Cambiar el método de pago a " +
      	etiqueta +
      	"?\n\nÚsalo cuando el cliente pagó por una vía distinta a la que " +
      	"eligió al comprar."
  	)
	) {
  	return;
	}

	setSaving(true);
	try {
  	const res = await fetch("/api/admin/pedido/" + id, {
    	method: "PATCH",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ metodo_pago: metodo }),
  	});

  	if (!res.ok) {
    	const data = await res.json();
    	alert("No se pudo cambiar: " + (data.error || "error desconocido"));
    	return;
  	}

  	// Al dejar de ser un pedido de Flow, la verificación anterior ya no
  	// aplica; se limpia para que no quede la alarma roja de un pago que ya
  	// no corresponde vigilar.
  	setFlowEstado(null);
  	await fetchPedido();
	} finally {
  	setSaving(false);
	}
  };

  const confirmarPago = async () => {
	// En pedidos de Flow, avisar "pago confirmado" cuando Flow dice que no
	// está pagado es justo el error que hace producir un pedido impago.
	if (pedido?.metodo_pago === "flow" && flowEstado?.aplica) {
  	if (flowEstado.error) {
    	if (
      	!confirm(
        	"No se pudo verificar el pago con Flow (" +
          	flowEstado.error +
          	").\n\n¿Confirmar igual? Solo hazlo si comprobaste el pago por otra vía."
      	)
    	) {
      	return;
    	}
  	} else if (!flowEstado.pagado) {
    	alert(
      	"Flow dice que este pago NO está confirmado: " +
        	flowEstado.etiqueta +
        	".\n\nNo se envió ningún aviso. Si el cliente pagó por otra vía, " +
        	"cambia el método de pago del pedido antes de confirmar."
    	);
    	return;
  	}
	}

	if (
  	!confirm(
    	"¿Confirmar el pago y enviarle el aviso al cliente por email?"
  	)
	) {
  	return;
	}

	setConfirmando(true);

	try {
  	const res = await fetch("/api/admin/pedido/" + id, {
    	method: "PATCH",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ confirmar: true }),
  	});

  	const data = await res.json();

  	if (!res.ok) {
    	alert("No se pudo confirmar: " + (data.error || "error desconocido"));
  	} else if (data.confirmacion === "error") {
    	alert(
      	"El pedido quedó confirmado, pero el email no salió. Revisa los logs."
    	);
  	} else if (data.confirmacion === "ya_enviado") {
    	alert("Este cliente ya había sido avisado, no se reenvió el email.");
  	}

  	await fetchPedido();
	} finally {
  	setConfirmando(false);
	}
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

	// Si van en el mismo paquete comparten el mismo seguimiento; si no, los
	// otros pedidos quedarían para siempre "sin despachar" en la web.
	let tambienAgrupados = false;
	if (agrupables.length > 0) {
  	tambienAgrupados = confirm(
    	"Este pedido se despacha junto con " +
      	agrupables.map((p) => "#" + p.numero).join(", ") +
      	".\n\n¿Aplicar el mismo tracking a esos pedidos también?\n\n" +
      	"Acepta si van todos en este paquete."
  	);
	}

	setSaving(true);

	const cuerpo = {
  	tracking_numero: trackingNum.trim(),
  	tracking_courier: trackingCourier,
  	fecha_envio: new Date().toISOString(),
  	estado: "enviado",
	};

	const destinos = [id, ...(tambienAgrupados ? agrupables.map((p) => p.id) : [])];

	const resultados = await Promise.all(
  	destinos.map((pid) =>
    	fetch("/api/admin/pedido/" + pid, {
      	method: "PATCH",
      	headers: { "Content-Type": "application/json" },
      	body: JSON.stringify(cuerpo),
    	})
  	)
	);

	const fallaron = resultados.filter((r) => !r.ok).length;
	if (fallaron > 0) {
  	alert(
    	`Se guardaron ${resultados.length - fallaron} de ${
      	resultados.length
    	} pedidos. Revisa los que quedaron sin tracking.`
  	);
	} else {
  	alert(
    	destinos.length > 1
      	? `✅ Tracking guardado en ${destinos.length} pedidos y email enviado al cliente`
      	: "✅ Tracking guardado y email enviado al cliente"
  	);
	}

	await fetchPedido();
	setSaving(false);
  };

  const toggleArchivado = async () => {
	if (!pedido) return;
	const archivando = !pedido.archivado_at;

	if (
  	archivando &&
  	!confirm(
    	"¿Archivar el pedido #" +
      	pedido.numero +
      	"?\n\nSale del panel y deja de contar para el material en cola y para " +
      	"agrupar envíos. No se borra: puedes recuperarlo cuando quieras."
  	)
	) {
  	return;
	}

	setSaving(true);
	try {
  	const res = await fetch("/api/admin/pedido/" + id, {
    	method: "PATCH",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ archivado: archivando }),
  	});
  	if (!res.ok) {
    	const data = await res.json();
    	alert(
      	"No se pudo archivar: " +
        	(data.error || "revisa que la migración de archivado esté corrida")
    	);
    	return;
  	}
  	if (archivando) {
    	router.push("/admin");
    	return;
  	}
  	await fetchPedido();
	} finally {
  	setSaving(false);
	}
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

  // --- Cartas agrupadas por fuente, para importar por separado en Cardwright ---
  // MPCFill (arte HD por Drive id) → botón "MPC XML…".
  // Scryfall/Gatherer (printing por set+número) → textbox "Resolve & add".
  // Custom (imagen propia) → se cargan a mano.
  const allItems = pedido?.items || [];
  // El juego decide por dónde entra la carta a Cardwright. Un pedido sin el
  // campo es de cuando el sitio era solo Magic.
  const esMtg = (it: PedidoItem) => (it.juego ?? "mtg") === "mtg";
  const mpcItems = allItems.filter((it) => it.mpcfillId && !it.isCustom);
  const scryfallItems = allItems.filter(
	(it) => !it.mpcfillId && !it.isCustom && esMtg(it)
  );
  // Yu-Gi-Oh y lo que venga después: Cardwright los tiene en su buscador pero
  // no los importa por lista, así que van aparte y se cargan a mano.
  const otrosJuegos = allItems.filter(
	(it) => !it.mpcfillId && !it.isCustom && !esMtg(it)
  );
  const customItems = allItems.filter((it) => it.isCustom);


  // Los dorsos van agrupados por imagen: lo normal es uno solo para todo el
  // pedido, y lo que interesa al producir es cuántas cartas lo llevan.
  const dorsosDelPedido = Object.values(
	allItems
  	.filter((it) => it.dorsoUrl)
  	.reduce<Record<string, { url: string; nombre: string; cartas: number }>>(
    	(acc, it) => {
      	const url = it.dorsoUrl!;
      	acc[url] = {
        	url,
        	nombre: it.dorsoNombre || "Dorso personalizado",
        	cartas: (acc[url]?.cartas ?? 0) + it.quantity,
      	};
      	return acc;
    	},
    	{}
  	)
  );
  const sumQty = (arr: PedidoItem[]) => arr.reduce((s, it) => s + it.quantity, 0);

  // Decklist (formato MTGO) de las cartas Scryfall/Gatherer.
  const scryfallDeck = scryfallItems
	.map(
  	(it) =>
    	`${it.quantity} ${it.name} (${(it.set || "").toUpperCase()}) ${it.collector_number} [${it.finish}]`
	)
	.join("\n");

  // XML de orden MPCFill con los diseños HD que eligió el cliente.
  const mpcXml = mpcItems.length ? buildMpcfillXml(mpcItems) : "";

  const copyDeck = async () => {
	await navigator.clipboard.writeText(scryfallDeck);
	setCopiedDeck(true);
	setTimeout(() => setCopiedDeck(false), 2000);
  };

  const copyXml = async () => {
	await navigator.clipboard.writeText(mpcXml);
	setCopiedXml(true);
	setTimeout(() => setCopiedXml(false), 2000);
  };

  const downloadXml = () => {
	const blob = new Blob([mpcXml], { type: "application/xml" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `pedido-${pedido?.numero ?? "mpcfill"}-mpcfill.xml`;
	a.click();
	URL.revokeObjectURL(url);
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
          	onClick={toggleArchivado}
          	disabled={saving}
          	className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/15 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
        	>
          	{saving ? (
            	<Loader2 className="animate-spin" size={16} />
          	) : pedido.archivado_at ? (
            	<ArchiveRestore size={16} />
          	) : (
            	<Archive size={16} />
          	)}
          	{pedido.archivado_at ? "Desarchivar" : "Archivar"}
        	</button>

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

    	{pedido.archivado_at && (
      	<div className="bg-white/5 border border-white/20 p-4 rounded-xl mb-6 flex items-center gap-3">
        	<Archive size={18} className="text-gray-400 flex-shrink-0" />
        	<div>
          	<p className="font-bold text-sm">Pedido archivado</p>
          	<p className="text-xs text-gray-400">
            	Archivado el{" "}
            	{new Date(pedido.archivado_at).toLocaleString("es-CL")}. No
            	aparece en el panel ni reserva material. Desarchívalo si vuelve a
            	estar activo.
          	</p>
        	</div>
      	</div>
    	)}

    	{agrupables.length > 0 && (
      	<div className="bg-[#FF4D1A]/10 border-2 border-[#FF4D1A]/60 p-5 rounded-xl mb-6">
        	<h2 className="font-bold mb-1 flex items-center gap-2">
          	<Package size={18} className="text-[#FF4D1A]" />
          	Despachar junto con{" "}
          	{agrupables.map((p) => "#" + p.numero).join(", ")}
        	</h2>
        	<p className="text-sm text-gray-300 mb-3">
          	Mismo cliente, misma dirección y ninguno despachado todavía. El
          	envío se cobró una sola vez, así que mandarlos por separado sale de
          	tu bolsillo.
        	</p>
        	<div className="flex flex-wrap gap-2">
          	{agrupables.map((p) => (
            	<button
              	key={p.id}
              	onClick={() => router.push("/admin/pedido/" + p.id)}
              	className="bg-[#0F1115] hover:bg-white/5 border border-white/10 hover:border-[#FF4D1A] px-3 py-2 rounded-lg text-sm"
            	>
              	Ver #{p.numero}{" "}
              	<span className="text-gray-400">
                	· {p.estado} · {formatCLP(p.total)}
              	</span>
            	</button>
          	))}
        	</div>
      	</div>
    	)}

    	{pedido.metodo_pago === "flow" && (
      	<div
        	className={
          	"p-5 rounded-xl mb-6 border " +
          	(flowEstado?.error || !flowEstado
            	? "bg-[#1E242B] border-white/10"
            	: flowEstado.pagado
            	? "bg-green-500/10 border-green-500/30"
            	: "bg-red-500/15 border-red-500/50")
        	}
      	>
        	<div className="flex justify-between items-center gap-2 flex-wrap mb-1">
          	<h2 className="font-bold flex items-center gap-2">
            	<CreditCard size={18} className="text-[#FF4D1A]" />
            	Pago en Flow (verificado en vivo)
          	</h2>
          	<button
            	onClick={verificarFlow}
            	disabled={verificandoFlow}
            	className="bg-[#0F1115] hover:bg-white/5 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-white/10 disabled:opacity-50"
          	>
            	{verificandoFlow ? (
              	<Loader2 className="animate-spin" size={14} />
            	) : (
              	<RefreshCw size={14} />
            	)}
            	Volver a verificar
          	</button>
        	</div>

        	{verificandoFlow && !flowEstado ? (
          	<p className="text-sm text-gray-400">Consultando a Flow…</p>
        	) : flowEstado?.error ? (
          	<p className="text-sm text-yellow-300">
            	⚠️ No se pudo verificar con Flow: {flowEstado.error}. No asumas
            	que está pagado sin comprobarlo.
          	</p>
        	) : flowEstado?.aplica === false ? (
          	<p className="text-sm text-gray-400">
            	Este pedido no tiene un pago de Flow asociado.
          	</p>
        	) : flowEstado ? (
          	<>
            	<p
              	className={
                	"text-2xl font-bold " +
                	(flowEstado.pagado ? "text-green-300" : "text-red-300")
              	}
            	>
              	{flowEstado.pagado ? "✓ PAGADO" : "✗ NO PAGADO"} —{" "}
              	{flowEstado.etiqueta}
            	</p>
            	{flowEstado.pagado && (
              	<p className="text-sm text-green-200/80 mt-1">
                	Flow confirma el pago
                	{flowEstado.monto
                  	? " por " + formatCLP(flowEstado.monto)
                  	: ""}
                	{flowEstado.pagador ? " · " + flowEstado.pagador : ""}.
              	</p>
            	)}
            	{!flowEstado.pagado &&
              	ESTADOS_QUE_ASUMEN_PAGO.includes(pedido.estado) && (
                	<div className="mt-3 bg-red-500/20 border border-red-500/40 rounded-lg p-3">
                  	<p className="font-bold text-red-200 text-sm">
                    	🚨 OJO: el pedido está en &quot;{pedido.estado}&quot;
                    	pero Flow NO tiene el pago confirmado.
                  	</p>
                  	<p className="text-xs text-red-200/80 mt-1">
                    	No lo produzcas ni lo despaches hasta comprobar el pago.
                    	Si el cliente pagó por transferencia (pasa cuando Flow le
                    	falla), cámbialo a <b>Transferencia</b> en el recuadro{" "}
                    	<b>Pago</b> más abajo y esta alarma desaparece.
                  	</p>
                	</div>
              	)}
          	</>
        	) : (
          	<p className="text-sm text-gray-400">Sin verificar.</p>
        	)}
      	</div>
    	)}

    	{pedido.confirmacion_enviada_at ? (
      	<div className="bg-green-500/10 border border-green-500/30 p-5 rounded-xl mb-6">
        	<h2 className="font-bold mb-1 flex items-center gap-2 text-green-300">
          	<CheckCircle2 size={18} /> Cliente avisado
        	</h2>
        	<p className="text-sm text-green-200/80">
          	Se le confirmó el pago por email el{" "}
          	{new Date(pedido.confirmacion_enviada_at).toLocaleString("es-CL")}.
        	</p>
      	</div>
    	) : (
      	<div className="bg-[#1E242B] p-5 rounded-xl border border-[#FF4D1A]/30 mb-6">
        	<h2 className="font-bold mb-1 flex items-center gap-2">
          	<Mail size={18} className="text-[#FF4D1A]" /> Confirmar pago
        	</h2>
        	<p className="text-xs text-gray-400 mb-4">
          	Marca el pedido como <b>pagado</b> y le envía un email al cliente
          	avisándole que su pedido quedó confirmado. Se envía una sola vez.
          	{pedido.metodo_pago === "flow" && (
            	<>
              	{" "}
              	<span className="text-gray-500">
                	(Los pagos por Flow se confirman y avisan solos.)
              	</span>
            	</>
          	)}
        	</p>
        	<button
          	onClick={confirmarPago}
          	disabled={confirmando}
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
        	>
          	{confirmando ? (
            	<Loader2 className="animate-spin" size={14} />
          	) : (
            	<Mail size={14} />
          	)}
          	Confirmar pago y avisar al cliente
        	</button>
      	</div>
    	)}

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
        	<div className="flex justify-between items-center gap-2 mb-3">
          	<h2 className="font-bold">Cliente</h2>
          	{!editandoEnvio && !esRetiro && (
            	<button
              	onClick={abrirEdicionEnvio}
              	disabled={!!pedido.tracking_numero}
              	title={
                	pedido.tracking_numero
                  	? "Ya tiene tracking: el paquete salió con la dirección actual"
                  	: "Corregir los datos de despacho"
              	}
              	className="text-xs bg-[#0F1115] hover:bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            	>
              	<Pencil size={13} /> Editar envío
            	</button>
          	)}
        	</div>

        	{editandoEnvio ? (
          	<div className="space-y-3">
            	<div>
              	<label
                	htmlFor="env-nombre"
                	className="block text-xs text-gray-400 mb-1"
              	>
                	Nombre de quien recibe
              	</label>
              	<input
                	id="env-nombre"
                	value={envioForm.cliente_nombre}
                	onChange={(e) =>
                  	setEnvioForm({
                    	...envioForm,
                    	cliente_nombre: e.target.value,
                  	})
                	}
                	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm"
              	/>
            	</div>
            	<div>
              	<label
                	htmlFor="env-tel"
                	className="block text-xs text-gray-400 mb-1"
              	>
                	Teléfono
              	</label>
              	<input
                	id="env-tel"
                	value={envioForm.cliente_telefono}
                	onChange={(e) =>
                  	setEnvioForm({
                    	...envioForm,
                    	cliente_telefono: e.target.value,
                  	})
                	}
                	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm"
              	/>
            	</div>
            	<div>
              	<label
                	htmlFor="env-dir"
                	className="block text-xs text-gray-400 mb-1"
              	>
                	Dirección *
              	</label>
              	<input
                	id="env-dir"
                	value={envioForm.direccion}
                	onChange={(e) =>
                  	setEnvioForm({ ...envioForm, direccion: e.target.value })
                	}
                	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm"
              	/>
            	</div>
            	<div className="grid grid-cols-2 gap-3">
              	<div>
                	<label
                  	htmlFor="env-com"
                  	className="block text-xs text-gray-400 mb-1"
                	>
                  	Comuna *
                	</label>
                	<input
                  	id="env-com"
                  	value={envioForm.comuna}
                  	onChange={(e) =>
                    	setEnvioForm({ ...envioForm, comuna: e.target.value })
                  	}
                  	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm"
                	/>
              	</div>
              	<div>
                	<label
                  	htmlFor="env-reg"
                  	className="block text-xs text-gray-400 mb-1"
                	>
                  	Región *
                	</label>
                	<select
                  	id="env-reg"
                  	value={envioForm.region}
                  	onChange={(e) =>
                    	setEnvioForm({ ...envioForm, region: e.target.value })
                  	}
                  	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm"
                	>
                  	{REGIONES.map((r) => (
                    	<option key={r} value={r}>
                      	{r}
                    	</option>
                  	))}
                	</select>
              	</div>
            	</div>

            	<p className="text-[11px] text-gray-500">
              	El cambio queda anotado en las notas internas, con fecha y la
              	dirección anterior.
            	</p>

            	<div className="flex gap-2">
              	<button
                	onClick={guardarEnvio}
                	disabled={saving}
                	className="bg-[#FF4D1A] hover:bg-[#e64418] px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              	>
                	{saving ? (
                  	<Loader2 className="animate-spin" size={14} />
                	) : (
                  	<Save size={14} />
                	)}
                	Guardar envío
              	</button>
              	<button
                	onClick={() => setEditandoEnvio(false)}
                	className="bg-[#0F1115] hover:bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm"
              	>
                	Cancelar
              	</button>
            	</div>
          	</div>
        	) : (
          	<>
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
          	</>
        	)}
      	</div>

      	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
        	<h2 className="font-bold mb-3">Pago</h2>
        	<p className="text-sm text-gray-400">Método</p>
        	<div className="flex gap-2 mb-3">
          	{[
            	{ key: "flow", label: "Flow.cl" },
            	{ key: "transferencia", label: "Transferencia" },
          	].map((m) => {
            	const activo = pedido.metodo_pago === m.key;
            	return (
              	<button
                	key={m.key}
                	onClick={() => !activo && cambiarMetodoPago(m.key)}
                	disabled={activo || saving}
                	className={
                  	"px-3 py-1.5 rounded-lg text-sm transition " +
                  	(activo
                    	? "bg-[#FF4D1A] text-white"
                    	: "bg-[#0F1115] border border-white/10 hover:border-[#FF4D1A]")
                	}
              	>
                	{m.label}
              	</button>
            	);
          	})}
        	</div>
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

    	<div className="mt-6">
      	<h2 className="font-bold text-lg mb-1">Importar a Cardwright</h2>
      	<p className="text-xs text-gray-400 mb-4">
        	Pedido separado por fuente. Cada bloque se importa por su vía en
        	Cardwright y ambos caen en la misma cola.
      	</p>

      	{/* MPCFill: arte HD exacto por Drive id → botón "MPC XML…" */}
      	{mpcItems.length > 0 && (
        	<div className="bg-[#1E242B] p-5 rounded-xl border border-[#FF4D1A]/30 mb-4">
          	<div className="flex justify-between items-center gap-2 flex-wrap mb-1">
            	<h3 className="font-bold flex items-center gap-2">
              	🎨 MPCFill ({sumQty(mpcItems)} cartas)
            	</h3>
            	<div className="flex gap-2">
              	<button
                	onClick={copyXml}
                	className="bg-[#0F1115] hover:bg-white/5 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-white/10"
              	>
                	{copiedXml ? <Check size={14} /> : <Copy size={14} />}
                	{copiedXml ? "Copiado!" : "Copiar XML"}
              	</button>
              	<button
                	onClick={downloadXml}
                	className="bg-[#0F1115] hover:bg-white/5 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-white/10"
              	>
                	<Download size={14} /> Descargar .xml
              	</button>
            	</div>
          	</div>
          	<p className="text-xs text-gray-400 mb-3">
            	En Cardwright: <b>Import → botón &quot;MPC XML…&quot;</b> → elige
            	este archivo (o descarga el .xml). Trae el arte HD{" "}
            	<b>exacto</b> que eligió el cliente.
          	</p>
          	<pre className="bg-[#0F1115] text-[#8fd3ff] p-4 rounded-lg text-xs font-mono whitespace-pre-wrap max-h-72 overflow-auto">
{mpcXml}
          	</pre>
        	</div>
      	)}

      	{/* Scryfall / Gatherer: printing exacto por set+número → "Resolve & add" */}
      	{scryfallItems.length > 0 && (
        	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mb-4">
          	<div className="flex justify-between items-center gap-2 flex-wrap mb-1">
            	<h3 className="font-bold flex items-center gap-2">
              	🃏 Scryfall / Gatherer ({sumQty(scryfallItems)} cartas)
            	</h3>
            	<button
              	onClick={copyDeck}
              	className="bg-[#0F1115] hover:bg-white/5 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-white/10"
            	>
              	{copiedDeck ? <Check size={14} /> : <Copy size={14} />}
              	{copiedDeck ? "Copiado!" : "Copiar lista"}
            	</button>
          	</div>
          	<p className="text-xs text-gray-400 mb-3">
            	En Cardwright: <b>Import → pega en &quot;Resolve &amp; add&quot;</b>
            	. Resuelve el printing exacto por set + número y lo sube a 1200 DPI.
            	(En Cardwright eliges Scryfall o Gatherer como fuente de la imagen.)
          	</p>
          	<pre className="bg-[#0F1115] text-[#FF4D1A] p-4 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-96 overflow-auto">
{scryfallDeck}
          	</pre>
        	</div>
      	)}

      	{/* Otros juegos: Cardwright los busca pero no los importa por lista */}
      	{otrosJuegos.length > 0 && (
        	<div className="bg-[#1E242B] p-5 rounded-xl border border-blue-400/30 mb-4">
          	<h3 className="font-bold flex items-center gap-2 mb-2">
            	🎴 Otros juegos ({sumQty(otrosJuegos)} cartas)
          	</h3>
          	<p className="text-xs text-blue-200/80 mb-3">
            	Cardwright tiene el buscador de estos juegos, pero <b>no importa
            	listas</b>: búscalas por nombre en su pestaña y elige el arte que
            	dice el número. Ojo con el <b>tamaño de carta</b>, que no es el de
            	Magic — mira la receta en <b>Fórmulas</b>.
          	</p>
          	<ul className="text-xs text-gray-300 space-y-1">
            	{otrosJuegos.map((it, i) => (
              	<li key={i}>
                	• {it.quantity}× {it.name} — arte {it.collector_number} ·{" "}
                	<span className="uppercase">{it.juego}</span> [{it.finish}]
              	</li>
            	))}
          	</ul>
        	</div>
      	)}

      	{/* Custom: imagen propia del cliente, se cargan a mano */}
      	{customItems.length > 0 && (
        	<div className="bg-[#1E242B] p-5 rounded-xl border border-yellow-500/30 mb-4">
          	<h3 className="font-bold flex items-center gap-2 mb-2">
            	🖼️ Custom ({sumQty(customItems)} cartas)
          	</h3>
          	<p className="text-xs text-yellow-200/80 mb-3">
            	Imágenes propias del cliente — no salen de Scryfall ni MPCFill.
            	Cárgalas a mano en Cardwright (arrástralas o usa &quot;Add
            	cards…&quot;); las miniaturas están abajo en <b>Cartas</b>.
          	</p>
          	<ul className="text-xs text-gray-300 space-y-1">
            	{customItems.map((it, i) => (
              	<li key={i}>
                	• {it.quantity}× {it.name} [{it.finish}]
              	</li>
            	))}
          	</ul>
        	</div>
      	)}
    	</div>

    	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10 mt-6">
      	<h2 className="font-bold mb-3">
        	Cartas ({pedido.items.length} items)
      	</h2>

      	{dorsosDelPedido.length > 0 ? (
        	<div className="bg-[#FF4D1A]/10 border border-[#FF4D1A]/30 rounded-lg p-3 mb-4">
          	<p className="text-sm font-semibold text-[#ffb088] mb-2">
            	Este pedido lleva dorso personalizado — hay que imprimir el
            	reverso.
          	</p>
          	<div className="flex flex-wrap gap-3">
            	{dorsosDelPedido.map((d) => (
              	<a
                	key={d.url}
                	href={d.url}
                	target="_blank"
                	rel="noreferrer"
                	className="flex items-center gap-2 bg-[#0F1115] border border-white/10 rounded-lg p-2 hover:border-[#FF4D1A]/50"
              	>
                	<span
                  	role="img"
                  	aria-label={d.nombre}
                  	className="w-[40px] h-[56px] rounded bg-[#1E242B] bg-center bg-cover bg-no-repeat block"
                  	style={{ backgroundImage: `url(${d.url})` }}
                	/>
                	<span className="text-xs">
                  	<span className="block font-semibold truncate max-w-[160px]">
                    	{d.nombre}
                  	</span>
                  	<span className="block text-gray-400">
                    	{d.cartas} carta{d.cartas !== 1 ? "s" : ""} · abrir
                  	</span>
                	</span>
              	</a>
            	))}
          	</div>
        	</div>
      	) : null}

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
            	{it.dorsoUrl ? (
              	<p className="text-[10px] text-[#ffb088]">+ dorso custom</p>
            	) : null}
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


