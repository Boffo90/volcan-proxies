"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { usePrecios } from "@/hooks/usePrecios";
import { formatCLP } from "@/lib/pricing";

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);
  const { precios } = usePrecios();

  const FAQS = [
	{
  	q: "¿Qué es un proxy?",
  	a: "Un proxy es una réplica de una carta oficial, hecha para uso casual, playtest o coleccionable. En Volcán Proxies las imprimimos en papel fotográfico premium y las laminamos en calor para que se sientan como cartas reales al barajar y jugar.",
	},
	{
  	q: "¿Las cartas son indistinguibles de las reales?",
  	a: "No. Volcán Proxies son proxies artesanales hechas a mano. Aunque tienen firmeza similar a una carta real, dorso impreso (no quedan en blanco) y se ven visualmente fieles desde la distancia normal de juego, NO buscan ser indistinguibles de las oficiales. Si las miras de cerca y las comparas con una carta original, verás diferencias en los detalles finos de impresión. Son perfectas para playtest, casual, cEDH y torneos proxy-friendly. No están diseñadas para engañar ni reemplazar a las cartas oficiales en torneos sancionados.",
	},
	{
  	q: "¿Cuánto cuestan?",
  	a: `Cartas unitarias: Glossy ${formatCLP(
    	precios.glossy
  	)} y Matte ${formatCLP(
    	precios.matte
  	)}. Tenemos promos automáticas al armar mazo completo: Mazo 60 desde ${formatCLP(
    	precios.mazo60_glossy
  	)} y Commander 100 desde ${formatCLP(
    	precios.commander100_glossy
  	)}. Los precios se aplican automáticamente al armar tu pedido en el carrito.`,
	},
	{
  	q: "¿Son legales en torneos?",
  	a: "Nuestros proxies son ideales para uso casual, partidas en casa, playtest y colección. No están autorizados en torneos sancionados por Wizards/Konami/etc. SÍ son válidos en torneos proxy-friendly o playtest tournaments, que cada vez son más comunes en formatos como cEDH. Te recomendamos consultar las reglas de tu local game store antes de usarlos en eventos.",
	},
	{
  	q: "¿Cuánto tarda mi pedido?",
  	a: "Una vez confirmado el pago, dejamos tu pedido despachado en máximo 48 horas vía Starken, Chilexpress o Blue Express. El tiempo de envío depende del courier y tu región: en Santiago/regiones cercanas suele tardar 3-5 días hábiles, en regiones extremas hasta 7-10 días. Te enviamos el número de seguimiento por email para que puedas tracear tu pedido.",
	},
	{
  	q: "¿Qué métodos de pago aceptan?",
  	a: "Aceptamos transferencia bancaria (BCI/MACH) y Flow.cl (tarjeta de crédito/débito/Webpay). Con transferencia, una vez confirmes el pedido recibirás los datos para transferir; una vez recibido el comprobante, comenzamos la impresión. Con Flow.cl el pago se procesa inmediatamente y comenzamos a imprimir apenas se confirme.",
	},
	{
  	q: "¿Puedo devolver mi pedido?",
  	a: "Por ser producto bajo demanda (cada carta se imprime específicamente para tu pedido) no aceptamos devoluciones por cambio de opinión. PERO si tu pedido llega con defectos de impresión, te lo reimprimimos sin costo. Solo escríbenos a smyanezo@gmail.com con fotos del problema.",
	},
	{
  	q: "¿De qué calidad son las cartas?",
  	a: "Imprimimos en papel fotográfico de alto gramaje, luego laminamos en calor con bolsas tamaño carta. Hay dos acabados: Glossy (brillante, look clásico) y Matte (mate, sin reflejo, sensación premium). Las cartas tienen el tamaño estándar MTG/Pokémon (63x88mm aprox) y se barajan perfectamente con cartas reales.",
	},
	{
  	q: "¿Puedo elegir el arte de la carta?",
  	a: "¡Sí! Al entrar al detalle de cualquier carta verás todas las versiones disponibles (arte original, arte alternativo, showcase, borderless, etc.). Toda esa info viene directo de Scryfall, así que siempre estará actualizada con los sets más nuevos.",
	},
	{
  	q: "¿Puedo subir mi propio diseño?",
  	a: `Sí. Tenemos la sección /custom donde puedes subir imágenes JPG o PNG (máximo 5MB) y nosotros las imprimimos como carta. Útil para tokens custom, alters, basic lands con arte personalizado, etc. Hay un recargo extra de ${formatCLP(
    	precios.custom_surcharge
  	)} por carta custom para cubrir el ajuste manual.`,
	},
	{
  	q: "¿Hacen pedidos grandes / al por mayor?",
  	a: "Sí, contáctanos directamente a smyanezo@gmail.com o por Instagram @volcanproxies. Para pedidos sobre 200 cartas o de mazos para tu local game store podemos negociar precios especiales.",
	},
	{
  	q: "¿Cómo aplican las promos de mazo?",
  	a: "Si armas un carrito con exactamente 60 cartas (todas mismo acabado, sin custom) aplica el precio promo de Mazo 60. Si llegas a 100 cartas, aplica Commander 100. Las promos NO aplican si mezclas Glossy y Matte o si tienes cartas custom en el mismo pedido — en esos casos se cobra precio unitario.",
	},
  ];

  const openMail = () => {
	window.location.href = "mailto:smyanezo@gmail.com";
  };

  const openInstagram = () => {
	window.open("https://instagram.com/volcanproxies", "_blank");
  };

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />

  	<section className="px-6 py-16 max-w-3xl mx-auto">
    	<div className="text-center mb-12">
      	<HelpCircle className="mx-auto text-[#FF4D1A] mb-4" size={48} />
      	<h1 className="text-4xl md:text-5xl font-bold mb-3">
        	Preguntas <span className="text-[#FF4D1A]">frecuentes</span>
      	</h1>
      	<p className="text-gray-400">
        	Todo lo que necesitas saber antes de tu primer pedido.
      	</p>
    	</div>

    	<div className="space-y-3">
      	{FAQS.map((faq, idx) => {
        	const isOpen = open === idx;
        	return (
          	<div
            	key={idx}
            	className="bg-[#1E242B] rounded-xl border border-white/10 overflow-hidden"
          	>
            	<button
              	onClick={() => setOpen(isOpen ? null : idx)}
              	className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/5 transition text-left"
            	>
              	<span className="font-semibold">{faq.q}</span>
              	<ChevronDown
                	className={
                  	"text-[#FF4D1A] flex-shrink-0 transition-transform " +
                  	(isOpen ? "rotate-180" : "")
                	}
                	size={20}
              	/>
            	</button>
            	{isOpen && (
              	<div className="px-5 pb-5 text-gray-300 text-sm leading-relaxed border-t border-white/5 pt-4">
                	{faq.a}
              	</div>
            	)}
          	</div>
        	);
      	})}
    	</div>

    	<div className="bg-gradient-to-r from-[#FF4D1A]/20 to-transparent border border-[#FF4D1A]/30 p-6 rounded-xl mt-10 text-center">
      	<h3 className="font-bold mb-2">¿No encontraste tu respuesta?</h3>
      	<p className="text-sm text-gray-300 mb-4">
        	Escríbenos directamente, respondemos rápido.
      	</p>
      	<div className="flex flex-wrap gap-3 justify-center">
        	<button
          	onClick={openMail}
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-5 py-2 rounded-lg text-sm font-semibold transition"
        	>
          	📧 smyanezo@gmail.com
        	</button>
        	<button
          	onClick={openInstagram}
          	className="border border-white/20 hover:bg-white/5 px-5 py-2 rounded-lg text-sm font-semibold transition"
        	>
          	📱 @volcanproxies
        	</button>
      	</div>
    	</div>
  	</section>

  	<Footer />
	</main>
  );
}

