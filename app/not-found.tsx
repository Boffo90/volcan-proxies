/**
 * El 404 del sitio.
 *
 * El que trae Next por defecto es un "404 This page could not be found" sobre
 * fondo blanco, que en este sitio se hereda oscuro y queda como una pantalla
 * casi vacía: el mismo síntoma que un error sin red, y la misma sensación de
 * callejón sin salida. Acá al menos se ve de quién es la página y adónde ir.
 */

import Link from "next/link";
import { Compass } from "lucide-react";

const SALIDAS = [
  { href: "/catalogo", label: "Buscar cartas" },
  { href: "/importar", label: "Importar una lista" },
  { href: "/acabados", label: "Ver los acabados" },
  { href: "/promos", label: "Ver las promos" },
];

export default function NotFound() {
  return (
	<main className="min-h-screen bg-surface text-ink-soft flex items-center justify-center px-6 py-20">
  	<div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
    	<Compass className="mx-auto text-flame-ink mb-4" size={40} />

    	<h1 className="font-display font-extrabold text-2xl mb-3">
      	Esta página no existe
    	</h1>

    	<p className="text-ink-soft mb-6 text-sm leading-relaxed">
      	El enlace está roto o la página se movió. Tu carrito sigue guardado.
    	</p>

    	<Link
      	href="/"
      	className="block w-full btn-flame py-2.5 rounded-lg font-semibold mb-5"
    	>
      	Volver al inicio
    	</Link>

    	<div className="flex flex-wrap gap-2 justify-center">
      	{SALIDAS.map((s) => (
        	<Link
          	key={s.href}
          	href={s.href}
          	className="text-xs border border-line hover:border-line px-3 py-1.5 rounded-lg text-ink-soft"
        	>
          	{s.label}
        	</Link>
      	))}
    	</div>
  	</div>
	</main>
  );
}
