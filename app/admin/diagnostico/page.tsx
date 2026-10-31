"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";

type Veredicto = "ok" | "aviso" | "error";

type Chequeo = {
  nombre: string;
  veredicto: Veredicto;
  detalle: string;
  paraQue: string;
};

type Datos = {
  variables: Chequeo[];
  resend: {
	veredicto: Veredicto;
	detalle: string;
	dominios: { nombre: string; estado: string }[];
  };
  pedidos:
	| { disponible: true; total: number; pedidos: { numero: number; fecha: string; nota: string }[] }
	| { disponible: false; motivo: string };
  flowSandbox: boolean;
  entorno: string;
};

const ESTILO: Record<Veredicto, { icono: typeof CheckCircle2; color: string; borde: string }> = {
  ok: { icono: CheckCircle2, color: "text-green-700", borde: "border-green-700/35" },
  aviso: { icono: AlertTriangle, color: "text-amber-700", borde: "border-amber-700/35" },
  error: { icono: XCircle, color: "text-red-700", borde: "border-red-700/35" },
};

function Fila({ c }: { c: Chequeo }) {
  const { icono: Icono, color, borde } = ESTILO[c.veredicto];
  return (
	<div className={"flex gap-3 p-4 rounded-lg border bg-ink/[0.03] " + borde}>
  	<Icono className={color + " shrink-0 mt-0.5"} size={18} />
  	<div className="min-w-0">
    	<p className="font-mono text-sm font-semibold">{c.nombre}</p>
    	<p className="text-xs text-ink-faint mb-1">{c.paraQue}</p>
    	<p className={"text-sm " + (c.veredicto === "ok" ? "text-ink-soft" : color)}>
      	{c.detalle}
    	</p>
  	</div>
	</div>
  );
}

export default function AdminDiagnosticoPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/diagnostico", { cache: "no-store" });
	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}
	setDatos((await res.json()) as Datos);
	setLoading(false);
  }, [router]);

  useEffect(() => {
	cargar();
  }, [cargar]);

  if (loading || !datos) {
	return (
  	<main className="min-h-screen bg-surface text-ink-soft flex justify-center py-32">
    	<Loader2 className="animate-spin text-flame-ink" size={32} />
  	</main>
	);
  }

  const problemas = datos.variables.filter((v) => v.veredicto !== "ok").length;
  const resendEstilo = ESTILO[datos.resend.veredicto];
  const ResendIcono = resendEstilo.icono;

  return (
	<main className="min-h-screen bg-surface text-ink-soft">
  	<div className="max-w-3xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/admin")}
      	className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al panel
    	</button>

    	<div className="flex items-start justify-between gap-4 mb-2">
      	<h1 className="text-3xl font-bold flex items-center gap-2">
        	<Stethoscope className="text-flame-ink" size={28} />
        	Diagnóstico
      	</h1>
      	<button
        	onClick={cargar}
        	className="flex items-center gap-2 text-sm border border-line rounded-lg px-3 py-1.5 hover:border-line"
      	>
        	<RefreshCw size={14} /> Revisar de nuevo
      	</button>
    	</div>
    	<p className="text-ink-muted mb-1">
      	Si la configuración está bien puesta donde tiene que estar. Entorno:{" "}
      	<span className="font-mono text-ink-soft">{datos.entorno}</span>.
    	</p>
    	<p className="text-xs text-ink-faint mb-8">
      	Acá no se muestra ningún valor, solo si está y si tiene la forma
      	correcta. Los cambios en Vercel necesitan un despliegue nuevo para
      	entrar en vigor.
    	</p>

    	{problemas === 0 && datos.resend.veredicto === "ok" ? (
      	<div className="flex gap-3 p-4 rounded-lg border border-green-700/35 bg-green-500/5 mb-8">
        	<CheckCircle2 className="text-green-700 shrink-0" size={18} />
        	<p className="text-sm text-ink-soft">
          	Todo en orden: las variables están puestas y Resend acepta la
          	llave con el dominio verificado.
        	</p>
      	</div>
    	) : null}

    	<h2 className="font-bold text-lg mb-3">Variables de entorno</h2>
    	<div className="space-y-2 mb-8">
      	{datos.variables.map((c) => (
        	<Fila key={c.nombre} c={c} />
      	))}
    	</div>

    	<h2 className="font-bold text-lg mb-3">Envío de correos</h2>
    	<div
      	className={
        	"flex gap-3 p-4 rounded-lg border bg-ink/[0.03] mb-3 " +
        	resendEstilo.borde
      	}
    	>
      	<ResendIcono className={resendEstilo.color + " shrink-0 mt-0.5"} size={18} />
      	<div>
        	<p className="font-semibold text-sm">Resend</p>
        	<p className="text-xs text-ink-faint mb-1">
          	Se le pregunta de verdad, no se asume.
        	</p>
        	<p
          	className={
            	"text-sm " +
            	(datos.resend.veredicto === "ok" ? "text-ink-soft" : resendEstilo.color)
          	}
        	>
          	{datos.resend.detalle}
        	</p>
      	</div>
    	</div>
    	{datos.resend.dominios.length > 0 && (
      	<div className="rounded-lg border border-line p-4 mb-8">
        	<p className="text-xs text-ink-faint mb-2">
          	Dominios en esa cuenta de Resend
        	</p>
        	<ul className="space-y-1">
          	{datos.resend.dominios.map((d) => (
            	<li key={d.nombre} className="text-sm flex justify-between gap-4">
              	<span className="font-mono">{d.nombre}</span>
              	<span
                	className={
                  	d.estado === "verified" ? "text-green-700" : "text-amber-700"
                	}
              	>
                	{d.estado}
              	</span>
            	</li>
          	))}
        	</ul>
      	</div>
    	)}

    	<h2 className="font-bold text-lg mb-3">Correos que no salieron</h2>
    	{!datos.pedidos.disponible ? (
      	<div className="rounded-lg border border-amber-700/35 p-4 mb-8">
        	<p className="text-sm text-amber-700">
          	No se pudo consultar los pedidos: {datos.pedidos.motivo}
        	</p>
      	</div>
    	) : datos.pedidos.total === 0 ? (
      	<div className="rounded-lg border border-green-700/35 p-4 mb-8">
        	<p className="text-sm text-ink-soft">
          	Ningún pedido tiene anotado un fallo de envío.
        	</p>
      	</div>
    	) : (
      	<div className="rounded-lg border border-red-700/35 p-4 mb-8">
        	<p className="text-sm text-red-700 mb-3">
          	{datos.pedidos.total} pedido
          	{datos.pedidos.total === 1 ? "" : "s"} con el correo fallido. A
          	esos clientes hay que escribirles a mano.
        	</p>
        	<ul className="space-y-2">
          	{datos.pedidos.pedidos.map((p) => (
            	<li key={p.numero} className="text-sm border-t border-line pt-2">
              	<div className="flex justify-between gap-4">
                	<span className="font-semibold">#{p.numero}</span>
                	<span className="text-ink-faint text-xs">
                  	{new Date(p.fecha).toLocaleString("es-CL")}
                	</span>
              	</div>
              	<p className="text-xs text-ink-muted mt-0.5">{p.nota}</p>
            	</li>
          	))}
        	</ul>
      	</div>
    	)}

    	{datos.flowSandbox && (
      	<div className="flex gap-3 p-4 rounded-lg border border-amber-700/35 bg-amber-500/5">
        	<AlertTriangle className="text-amber-700 shrink-0" size={18} />
        	<p className="text-sm text-amber-700">
          	<b>Flow está apuntando al sandbox.</b> Los pagos son de mentira y
          	no llega plata. Normal en local; en producción, no.
        	</p>
      	</div>
    	)}
  	</div>
	</main>
  );
}
