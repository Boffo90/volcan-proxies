"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import NavBar from "@/components/NavBar";

function GraciasContent() {
  const params = useSearchParams();
  const router = useRouter();
  const numero = params.get("pedido");
  const metodo = params.get("metodo");
  const estado = params.get("estado");

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />
  	<div className="max-w-2xl mx-auto px-6 py-20 text-center">
    	<CheckCircle2 className="mx-auto text-[#FF4D1A] mb-6" size={64} />
    	<h1 className="text-3xl md:text-4xl font-bold mb-4">
      	¡Gracias por tu compra! 🌋
    	</h1>
    	<p className="text-gray-300 mb-2">
      	Tu pedido <b className="text-[#FF4D1A]">#{numero}</b> fue recibido.
    	</p>
    	{estado === "pendiente" ? (
      	<p className="text-yellow-400 mb-6">
        	Tu pago está en proceso de verificación.
      	</p>
    	) : null}

    	{metodo === "transferencia" ? (
      	<div className="bg-[#1E242B] p-6 rounded-xl border border-white/10 text-left mt-6">
        	<h2 className="font-bold mb-3">Datos para transferencia</h2>
        	<div className="text-sm space-y-1">
          	<p><b>Banco:</b> BCI</p>
          	<p><b>Tipo:</b> Cuenta Vista (MACH)</p>
          	<p><b>Número:</b> 777017598354</p>
          	<p><b>Nombre:</b> Sebastian Yáñez</p>
          	<p><b>RUT:</b> 17.598.354-6</p>
          	<p><b>Email:</b> smyanezo@gmail.com</p>
        	</div>
        	<p className="text-xs text-gray-400 mt-4">
          	Envía el comprobante a smyanezo@gmail.com indicando tu pedido #{numero}.
        	</p>
      	</div>
    	) : null}

    	<button
      	onClick={() => router.push("/catalogo")}
      	className="mt-8 text-[#FF4D1A] hover:underline"
    	>
      	← Seguir comprando
    	</button>
  	</div>
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

