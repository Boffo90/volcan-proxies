"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Clock, AlertTriangle } from "lucide-react";
import {
  ESTADOS,
  PLAZOS_DEFAULT,
  normalizePlazos,
  promesa,
  type EstadoPlazo,
  type Plazos,
} from "@/lib/plazos";

type Cola = {
  pedidos: number;
  cartas: number;
  horas: number;
  diasHabiles: number | null;
};

const ETIQUETA: Record<EstadoPlazo, { label: string; desc: string; color: string }> = {
  normal: {
	label: "Normal",
	desc: "Se promete el plazo como un máximo. Sin aviso en el sitio.",
	color: "border-green-500/40 bg-green-500/10",
  },
  alta: {
	label: "Alta demanda",
	desc: "El plazo pasa a ser aproximado y aparece un aviso en todo el sitio.",
	color: "border-amber-500/40 bg-amber-500/10",
  },
  pausado: {
	label: "Pausado",
	desc: "Además, el checkout no deja terminar la compra.",
	color: "border-red-500/40 bg-red-500/10",
  },
};

export default function AdminPlazosPage() {
  const router = useRouter();
  const [plazos, setPlazos] = useState<Plazos>(PLAZOS_DEFAULT);
  const [cola, setCola] = useState<Cola | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);

  const cargar = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/plazos", { cache: "no-store" });
	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}
	const data = await res.json();
	setPlazos(normalizePlazos(data.plazos));
	setCola(data.cola);
	setSucio(false);
	setLoading(false);
  }, [router]);

  useEffect(() => {
	cargar();
  }, [cargar]);

  const set = <K extends keyof Plazos>(k: K, v: Plazos[K]) => {
	setPlazos((p) => ({ ...p, [k]: v }));
	setSucio(true);
  };

  const guardar = async () => {
	setSaving(true);
	setError(null);
	try {
  	const res = await fetch("/api/admin/plazos", {
    	method: "PATCH",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify(plazos),
  	});
  	if (!res.ok) {
    	setError(
      	res.status === 401
        	? "Se venció la sesión de admin. Vuelve a entrar y guarda de nuevo."
        	: `No se pudo guardar (error ${res.status}).`
    	);
    	return;
  	}
  	setSavedAt(new Date().toLocaleTimeString("es-CL"));
  	setSucio(false);
  	cargar();
	} catch {
  	setError("No se pudo guardar: falló la conexión.");
	} finally {
  	setSaving(false);
	}
  };

  if (loading) {
	return (
  	<main className="min-h-screen bg-[#0b0d11] text-white flex justify-center py-32">
    	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
  	</main>
	);
  }

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<div className="max-w-3xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/admin")}
      	className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al panel
    	</button>

    	<h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
      	<Clock className="text-[#FF4D1A]" size={28} />
      	Plazos de entrega
    	</h1>
    	<p className="text-gray-400 mb-8">
      	Lo que dice el sitio en la portada, el checkout, la FAQ, nosotros y{" "}
      	<b className="text-white">el correo de confirmación</b>. Se guarda en el
      	pedido al comprar, así que subir el plazo después no cambia lo que se le
      	prometió a quien ya compró.
    	</p>

    	{/* La cola real */}
    	<div className="rounded-xl border border-white/10 p-5 mb-8">
      	<h2 className="font-bold mb-3">Tu cola ahora</h2>
      	{!cola || cola.pedidos === 0 ? (
        	<p className="text-sm text-gray-400">
          	No hay pedidos pendientes. Puedes prometer tu plazo más corto.
        	</p>
      	) : (
        	<>
          	<div className="grid grid-cols-3 gap-4 mb-4">
            	<div>
              	<p className="text-2xl font-bold">{cola.pedidos}</p>
              	<p className="text-xs text-gray-500">pedidos sin salir</p>
            	</div>
            	<div>
              	<p className="text-2xl font-bold">{cola.cartas.toLocaleString("es-CL")}</p>
              	<p className="text-xs text-gray-500">cartas por producir</p>
            	</div>
            	<div>
              	<p className="text-2xl font-bold">{cola.horas.toFixed(1)} h</p>
              	<p className="text-xs text-gray-500">de trabajo, con tus tiempos</p>
            	</div>
          	</div>
          	{cola.diasHabiles === null ? (
            	<p className="text-sm text-amber-400">
              	Pon abajo cuántas horas al día le dedicas y te digo en cuántos
              	días sale esta cola.
            	</p>
          	) : (
            	<p className="text-sm text-gray-300">
              	A {plazos.horasPorDia} h al día, esta cola sale en{" "}
              	<b className="text-[#FF4D1A]">
                	{cola.diasHabiles} día{cola.diasHabiles === 1 ? "" : "s"} de
                	trabajo
              	</b>
              	. Eso es lo que tardaría el último pedido de la fila, sin contar
              	el despacho del courier.
            	</p>
          	)}
        	</>
      	)}
    	</div>

    	{/* Estado */}
    	<h2 className="font-bold mb-3">Estado</h2>
    	<div className="space-y-2 mb-8">
      	{ESTADOS.map((e) => (
        	<button
          	key={e}
          	onClick={() => set("estado", e)}
          	className={
            	"w-full text-left p-4 rounded-lg border transition " +
            	(plazos.estado === e
              	? ETIQUETA[e].color
              	: "border-white/10 hover:border-white/30")
          	}
        	>
          	<p className="font-semibold">{ETIQUETA[e].label}</p>
          	<p className="text-sm text-gray-400">{ETIQUETA[e].desc}</p>
        	</button>
      	))}
    	</div>

    	{/* Campos */}
    	<h2 className="font-bold mb-3">Qué se le dice al cliente</h2>
    	<div className="space-y-4 mb-8">
      	<div>
        	<label className="block text-sm font-semibold mb-1.5">
          	Plazo, en palabras
        	</label>
        	<input
          	value={plazos.plazo}
          	onChange={(e) => set("plazo", e.target.value)}
          	placeholder="48 horas"
          	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
        	/>
        	<p className="text-xs text-gray-500 mt-1">
          	Va a leerse: &quot;Despachamos {promesa(plazos)}&quot;.
        	</p>
      	</div>

      	<div>
        	<label className="block text-sm font-semibold mb-1.5">
          	Aviso extra <span className="text-gray-500 font-normal">(opcional)</span>
        	</label>
        	<textarea
          	value={plazos.aviso}
          	onChange={(e) => set("aviso", e.target.value)}
          	rows={2}
          	placeholder="Estamos con más pedidos de lo habitual. Gracias por la paciencia."
          	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
        	/>
        	<p className="text-xs text-gray-500 mt-1">
          	Aparece en la barra de aviso, bajo el plazo.
        	</p>
      	</div>

      	{plazos.estado === "pausado" && (
        	<div>
          	<label className="block text-sm font-semibold mb-1.5">
            	Cuándo vuelves a tomar pedidos
          	</label>
          	<input
            	value={plazos.reapertura}
            	onChange={(e) => set("reapertura", e.target.value)}
            	placeholder="el lunes 6 de octubre"
            	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
          	/>
        	</div>
      	)}

      	<div>
        	<label className="block text-sm font-semibold mb-1.5">
          	Horas de taller al día
        	</label>
        	<input
          	type="number"
          	min={0}
          	max={24}
          	step={0.5}
          	value={plazos.horasPorDia}
          	onChange={(e) => set("horasPorDia", Number(e.target.value))}
          	className="w-40 bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
        	/>
        	<p className="text-xs text-gray-500 mt-1">
          	Solo para estimar la cola de arriba. El cliente no lo ve. En cero, no
          	se estima nada.
        	</p>
      	</div>
    	</div>

    	{/* Vista previa */}
    	<h2 className="font-bold mb-3">Cómo se va a ver</h2>
    	<div className="rounded-lg border border-white/10 overflow-hidden mb-8">
      	{plazos.estado !== "normal" && (
        	<div
          	className={
            	"px-4 py-2.5 text-sm text-center " +
            	(plazos.estado === "pausado"
              	? "bg-red-500/15 text-red-300"
              	: "bg-[#FF4D1A]/15 text-[#ffb08a]")
          	}
        	>
          	{plazos.estado === "pausado" ? (
            	<>
              	<b>Pedidos pausados por ahora.</b>
              	{plazos.reapertura ? ` Volvemos ${plazos.reapertura}.` : ""}
            	</>
          	) : (
            	<>
              	<b>Estamos con alta demanda.</b> Despachamos{" "}
              	{promesa(plazos)}.
            	</>
          	)}
          	{plazos.aviso ? ` ${plazos.aviso}` : ""}
        	</div>
      	)}
      	<div className="p-4 text-sm text-gray-300">
        	En el correo al cliente:{" "}
        	<i>
          	&quot;Dejamos tu pedido despachado {promesa(plazos)} desde la
          	confirmación del pago.&quot;
        	</i>
      	</div>
    	</div>

    	<div className="border-t border-white/10 pt-4 flex justify-between items-center">
      	{error ? (
        	<p className="text-xs text-red-400">{error}</p>
      	) : sucio ? (
        	<p className="text-xs text-amber-400">
          	Tienes cambios sin guardar.
        	</p>
      	) : savedAt ? (
        	<p className="text-xs text-green-400">Guardado a las {savedAt}</p>
      	) : (
        	<p className="text-xs text-gray-500">
          	Click &quot;Guardar&quot; para aplicar
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
        	Guardar cambios
      	</button>
    	</div>

    	{plazos.estado === "pausado" && (
      	<div className="flex gap-3 p-4 rounded-lg border border-red-500/40 bg-red-500/5 mt-6">
        	<AlertTriangle className="text-red-400 shrink-0" size={18} />
        	<p className="text-sm text-red-300">
          	Con los pedidos pausados <b>nadie puede comprar</b>. Acuérdate de
          	volver a activarlo.
        	</p>
      	</div>
    	)}
  	</div>
	</main>
  );
}
