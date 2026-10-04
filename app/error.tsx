"use client";

/**
 * Lo que se ve cuando algo revienta en una página.
 *
 * El proyecto no tenía ninguno de estos. Sin él, un error de JavaScript en
 * producción deja al visitante mirando una pantalla vacía, sin explicación y
 * sin salida — un cliente lo reportó como "en el carrito completo sale todo
 * negra la pantalla". El error existía igual; lo que faltaba era que se viera.
 *
 * Dos cosas que esta pantalla tiene que hacer y que no son obvias:
 *
 *  - **Dar una salida.** Un error en el carrito es el peor caso: si lo que lo
 *    provoca está guardado en el navegador, recargar lo repite para siempre y
 *    el cliente no tiene cómo escapar. Por eso ahí se ofrece vaciarlo.
 *  - **Mostrar el código del error.** Next reemplaza el mensaje real por un
 *    `digest` en producción. Sin pedirle ese código al cliente, diagnosticar
 *    es adivinar, que es justo lo que pasó con este reporte.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home, Trash2 } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [enCarrito, setEnCarrito] = useState(false);
  const [vaciado, setVaciado] = useState(false);

  useEffect(() => {
	console.error("[ERROR DE PÁGINA]", error);
	const p = window.location.pathname;
	setEnCarrito(p.startsWith("/carrito") || p.startsWith("/checkout"));
  }, [error]);

  const vaciarCarrito = () => {
	try {
  	localStorage.removeItem("cart");
  	window.dispatchEvent(new Event("cart-updated"));
	} catch {
  	// Si el navegador bloquea el almacenamiento no hay nada que vaciar.
	}
	setVaciado(true);
  };

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white flex items-center justify-center px-6 py-20">
  	<div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
    	<AlertTriangle className="mx-auto text-[#FF4D1A] mb-4" size={40} />

    	<h1 className="font-display font-extrabold text-2xl mb-3">
      	Se nos cayó algo
    	</h1>

    	<p className="text-gray-300 mb-6 text-sm leading-relaxed">
      	Esta página no cargó bien. No es culpa tuya y tu pedido no se perdió:
      	lo que tengas en el carrito sigue guardado.
    	</p>

    	<div className="flex flex-col gap-2 mb-6">
      	<button
        	onClick={reset}
        	className="w-full bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2"
      	>
        	<RotateCw size={16} /> Reintentar
      	</button>

      	<Link
        	href="/"
        	className="w-full border border-white/15 hover:border-white/40 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
      	>
        	<Home size={16} /> Volver al inicio
      	</Link>

      	{enCarrito &&
        	(vaciado ? (
          	<p className="text-xs text-green-400 pt-1">
            	Carrito vaciado. Prueba a recargar la página.
          	</p>
        	) : (
          	<button
            	onClick={vaciarCarrito}
            	className="w-full text-xs text-gray-400 hover:text-red-400 py-2 flex items-center justify-center gap-2"
          	>
            	<Trash2 size={14} /> Si el error se repite, vacía el carrito
          	</button>
        	))}
    	</div>

    	<p className="text-xs text-gray-500 leading-relaxed">
      	Si te sigue pasando, escríbenos a{" "}
      	<a
        	href="mailto:volcanproxies@gmail.com"
        	className="text-[#FF4D1A] hover:underline"
      	>
        	volcanproxies@gmail.com
      	</a>
      	{error.digest ? (
        	<>
          	{" "}
          	y pásanos este código:
          	<br />
          	<code className="inline-block mt-1 px-2 py-1 rounded bg-white/5 text-gray-300 font-mono text-[11px]">
            	{error.digest}
          	</code>
        	</>
      	) : (
        	" contándonos qué estabas haciendo."
      	)}
    	</p>
  	</div>
	</main>
  );
}
