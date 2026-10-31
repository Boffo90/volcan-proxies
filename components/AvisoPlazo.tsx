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
    	"w-full px-4 py-2 text-center text-xs sm:text-sm " +
    	(pausado
      	? "bg-red-500/15 text-red-700 border-b border-red-700/35"
      	: "bg-flame-tint text-flame-ink border-b border-flame/50")
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
    	{plazos.aviso ? (
      	<span className="opacity-90 hidden sm:inline">{plazos.aviso}</span>
    	) : null}
  	</span>
	</div>
  );
}
