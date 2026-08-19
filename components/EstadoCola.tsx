"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

/**
* Le dice al cliente cuántos pedidos hay en produccion antes del suyo.
* Si el dato no se puede obtener no se muestra nada.
*/
export default function EstadoCola() {
  const [pedidos, setPedidos] = useState<number | null>(null);

  useEffect(() => {
	let vigente = true;
	fetch("/api/cola")
  	.then((r) => (r.ok ? r.json() : null))
  	.then((d) => {
    	if (vigente && typeof d?.pedidos === "number") setPedidos(d.pedidos);
  	})
  	.catch(() => {});
	return () => {
  	vigente = false;
	};
  }, []);

  if (pedidos === null) return null;

  return (
	<div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
  	<Clock size={14} className="text-[#FF4D1A] flex-shrink-0 mt-0.5" />
  	<span>
    	{pedidos === 0
      	? "No hay pedidos en producción: el tuyo parte primero."
      	: pedidos === 1
      	? "Hay 1 pedido en producción antes del tuyo."
      	: `Hay ${pedidos} pedidos en producción antes del tuyo.`}
  	</span>
	</div>
  );
}
