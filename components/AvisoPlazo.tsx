"use client";

/**
 * La barra de aviso cuando la cola está cargada.
 *
 * Va arriba de todo y en todas las páginas, porque el visitante puede entrar
 * por cualquiera. En marcha normal no se muestra nada: un aviso permanente
 * deja de leerse, y entonces no sirve el día que importa.
 */

import { usePlazos } from "@/hooks/usePlazos";
import { promesa } from "@/lib/plazos";
import { Clock } from "lucide-react";

export default function AvisoPlazo() {
  const { plazos, loading } = usePlazos();

  if (loading || plazos.estado === "normal") return null;

  const pausado = plazos.estado === "pausado";

  return (
	<div
  	className={
    	"w-full px-4 py-2.5 text-center text-sm " +
    	(pausado
      	? "bg-red-500/15 text-red-200 border-b border-red-500/25"
      	: "bg-[#FF4D1A]/15 text-[#ffc4a6] border-b border-[#FF4D1A]/25")
  	}
	>
  	<span className="inline-flex items-center gap-2 flex-wrap justify-center">
    	<Clock size={15} className="shrink-0" />
    	{pausado ? (
      	<span>
        	<b>Pedidos pausados por ahora.</b>
        	{plazos.reapertura ? ` Volvemos ${plazos.reapertura}.` : ""}
      	</span>
    	) : (
      	<span>
        	<b>Estamos con alta demanda.</b> Despachamos {promesa(plazos)}.
      	</span>
    	)}
    	{plazos.aviso ? <span className="opacity-90">{plazos.aviso}</span> : null}
  	</span>
	</div>
  );
}
