"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";
import { CheckCircle2, Loader2, AlertTriangle, CreditCard } from "lucide-react";
import NavBar from "@/components/NavBar";
import Reveal from "@/components/animation/Reveal";

/** Cuánto esperar a que Flow confirme antes de dar el pago por fallido. */
const INTENTOS_VERIFICACION = 5;
const ESPERA_MS = 2000;

function GraciasContent() {
  const params = useSearchParams();
  const router = useRouter();
  const numero = params.get("pedido");
  const metodo = params.get("metodo");

  // "verificando" solo aplica a Flow: la confirmación llega por webhook y puede
  // demorar unos segundos más que el redirect del navegador.
  const [estadoPago, setEstadoPago] = useState<
	"verificando" | "pagado" | "sin-pagar" | "desconocido"
  >(metodo === "flow" ? "verificando" : "desconocido");
  const [reintentando, setReintentando] = useState(false);

  useEffect(() => {
	if (metodo !== "flow" || !numero) return;

	let vigente = true;
	let intentos = 0;

	const revisar = async () => {
  	try {
    	const res = await fetch("/api/seguimiento/" + numero);
    	if (res.ok) {
      	const { pedido } = await res.json();
      	if (!vigente) return;
      	if (pedido?.estado && pedido.estado !== "recibido") {
        	setEstadoPago("pagado");
        	return;
      	}
    	}
  	} catch {
    	// se reintenta abajo
  	}
  	if (!vigente) return;
  	intentos++;
  	if (intentos >= INTENTOS_VERIFICACION) setEstadoPago("sin-pagar");
  	else setTimeout(revisar, ESPERA_MS);
	};

	revisar();
	return () => {
  	vigente = false;
	};
  }, [metodo, numero]);

  const reintentarPago = useCallback(async () => {
	setReintentando(true);
	try {
  	const res = await fetch("/api/pedido/pagar", {
    	method: "POST",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ numero }),
  	});
  	const data = await res.json();
  	if (data.payment_url) {
    	window.location.href = data.payment_url;
    	return;
  	}
  	alert(data.error || "No se pudo generar el link de pago.");
	} catch {
  	alert("No se pudo generar el link de pago. Intenta de nuevo.");
	} finally {
  	setReintentando(false);
	}
  }, [numero]);

  const pagoFallido = estadoPago === "sin-pagar";

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />
  	<Reveal className="max-w-2xl mx-auto px-6 py-20 text-center">
    	{estadoPago === "verificando" ? (
      	<>
        	<Loader2
          	className="mx-auto text-[#FF4D1A] mb-6 animate-spin"
          	size={56}
        	/>
        	<h1 className="font-display font-extrabold text-3xl md:text-4xl mb-4">
          	Verificando tu pago…
        	</h1>
        	<p className="text-gray-300">
          	Esto toma unos segundos. No cierres esta página.
        	</p>
      	</>
    	) : pagoFallido ? (
      	<>
        	<AlertTriangle
          	className="mx-auto text-yellow-400 mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]"
          	size={56}
        	/>
        	<h1 className="font-display font-extrabold text-3xl md:text-4xl mb-4">
          	Tu pago no se completó
        	</h1>
        	<p className="text-gray-300 mb-2">
          	Guardamos tu pedido{" "}
          	<b className="text-lava font-display font-bold">#{numero}</b>{" "}
          	completo, así que no perdiste nada. Puedes intentar pagarlo de
          	nuevo aquí mismo.
        	</p>
        	<p className="text-gray-500 text-sm mb-8">
          	Si acabas de pagar recién, puede que Flow todavía no nos confirme.
          	Recarga en un minuto antes de reintentar.
        	</p>

        	<button
          	onClick={reintentarPago}
          	disabled={reintentando}
          	className="bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-8 py-4 rounded-lg font-semibold text-lg inline-flex items-center gap-2 shadow-[0_10px_30px_-10px_rgba(255,79,26,0.6)] transition-all disabled:opacity-50"
        	>
          	{reintentando ? (
            	<Loader2 className="animate-spin" size={20} />
          	) : (
            	<CreditCard size={20} />
          	)}
          	Reintentar el pago
        	</button>

        	<p className="text-xs text-gray-500 mt-6">
          	¿Prefieres transferencia? Escríbenos a{" "}
          	<b className="text-gray-300">volcanproxies@gmail.com</b> indicando
          	tu pedido #{numero} y lo coordinamos.
        	</p>
      	</>
    	) : (
      	<>
        	<CheckCircle2
          	className="mx-auto text-[#FF4D1A] mb-6 drop-shadow-[0_0_15px_rgba(255,79,26,0.6)]"
          	size={64}
        	/>
        	<h1 className="font-display font-extrabold text-3xl md:text-4xl mb-4">
          	{estadoPago === "pagado"
            	? "¡Pago confirmado! 🌋"
            	: "¡Gracias por tu compra! 🌋"}
        	</h1>
        	<p className="text-gray-300 mb-2">
          	Tu pedido{" "}
          	<b className="text-lava font-display font-bold">#{numero}</b>{" "}
          	{estadoPago === "pagado"
            	? "quedó confirmado y entra a producción."
            	: "fue recibido."}
        	</p>

        	{metodo === "transferencia" ? (
          	<div className="glass-card p-6 rounded-xl text-left mt-6">
            	<h2 className="font-display font-bold mb-3">
              	Datos para transferencia
            	</h2>
            	<div className="text-sm space-y-1">
              	<p>
                	<b>Banco:</b> BCI
              	</p>
              	<p>
                	<b>Tipo:</b> Cuenta Vista (MACH)
              	</p>
              	<p>
                	<b>Número:</b> 777017598354
              	</p>
              	<p>
                	<b>Nombre:</b> Sebastian Yáñez
              	</p>
              	<p>
                	<b>RUT:</b> 17.598.354-6
              	</p>
              	{/* Correo con el que está registrada la cuenta MACH, no el de
                  	contacto: es el que valida el destinatario al transferir. */}
              	<p>
                	<b>Email:</b> smyanezo@gmail.com
              	</p>
            	</div>
            	<p className="text-xs text-gray-400 mt-4">
              	Envía el comprobante a volcanproxies@gmail.com indicando tu
              	pedido #{numero}.
            	</p>
          	</div>
        	) : null}
      	</>
    	)}

    	<div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
      	{numero ? (
        	<button
          	onClick={() => router.push("/seguimiento/" + numero)}
          	className="glass-card hover:border-[#FF4D1A]/40 px-6 py-3 rounded-lg font-semibold transition-colors"
        	>
          	Ver mi pedido
        	</button>
      	) : null}
      	<button
        	onClick={() => router.push("/catalogo")}
        	className="text-[#FF4D1A] hover:underline px-6 py-3"
      	>
        	← Seguir comprando
      	</button>
    	</div>
  	</Reveal>
	</main>
  );
}

export default function GraciasPage() {
  return (
	<Suspense>
  	<GraciasContent />
	</Suspense>
  );
}
