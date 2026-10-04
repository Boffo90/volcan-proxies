"use client";

/**
 * La última red: errores que ocurren en el layout raíz, donde `app/error.tsx`
 * ya no alcanza a montarse.
 *
 * Tiene que traer su propio `<html>` y `<body>` porque reemplaza al layout
 * entero, y por lo mismo no puede usar nada de él: ni la fuente, ni las clases
 * del sitio, ni los componentes. Todo va en estilos en línea a propósito.
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
	console.error("[ERROR GLOBAL]", error);
  }, [error]);

  return (
	<html lang="es">
  	<body
    	style={{
      	margin: 0,
      	minHeight: "100vh",
      	display: "flex",
      	alignItems: "center",
      	justifyContent: "center",
      	background: "#0b0d11",
      	color: "#fff",
      	fontFamily: "Arial, Helvetica, sans-serif",
      	padding: "24px",
    	}}
  	>
    	<div style={{ maxWidth: 420, textAlign: "center" }}>
      	<p style={{ fontSize: 40, margin: "0 0 8px" }}>🌋</p>
      	<h1 style={{ fontSize: 22, margin: "0 0 12px" }}>
        	Volcán Proxies no pudo cargar
      	</h1>
      	<p
        	style={{
          	fontSize: 14,
          	lineHeight: 1.6,
          	color: "#bbb",
          	margin: "0 0 20px",
        	}}
      	>
        	Algo falló al abrir el sitio. Tu carrito sigue guardado.
      	</p>
      	<button
        	onClick={reset}
        	style={{
          	background: "#FF4D1A",
          	color: "#fff",
          	border: "none",
          	borderRadius: 8,
          	padding: "11px 24px",
          	fontSize: 15,
          	fontWeight: "bold",
          	cursor: "pointer",
        	}}
      	>
        	Reintentar
      	</button>
      	<p style={{ fontSize: 12, color: "#777", marginTop: 20 }}>
        	Si sigue pasando, escríbenos a volcanproxies@gmail.com
        	{error.digest ? ` con el código ${error.digest}` : ""}.
      	</p>
    	</div>
  	</body>
	</html>
  );
}
