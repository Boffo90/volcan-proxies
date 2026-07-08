import { Flame, Heart, Printer, Users } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";

export const metadata = {
  title: "Nosotros · Volcán Proxies",
  description: "Quiénes somos y por qué hacemos proxies de calidad en Pucón.",
};

export default function NosotrosPage() {
  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />

  	<section className="px-6 py-16 max-w-4xl mx-auto">
    	<Reveal className="text-center mb-12">
      	<Flame className="mx-auto text-[#FF4D1A] mb-4 drop-shadow-[0_0_10px_rgba(255,79,26,0.6)]" size={48} />
      	<h1 className="font-display font-extrabold text-4xl md:text-5xl mb-4">Quiénes somos</h1>
      	<p className="text-xl text-gray-300 italic">
        	Que ganes por jugar contra mí, no contra mi billetera.
      	</p>
    	</Reveal>

    	<Reveal className="glass-card p-8 rounded-xl mb-8">
      	<h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
        	<Heart className="text-[#FF4D1A]" size={24} /> La historia
      	</h2>
      	<div className="space-y-4 text-gray-300 leading-relaxed">
        	<p>
          	Soy <b className="text-white">Seba Yáñez</b>, jugador apasionado
          	de <b className="text-[#FF4D1A]">cEDH</b> y entusiasta del TCG en
          	general. Llevo años imprimiendo proxies de forma privada para mis
          	amigos del grupo de juego, y vi cómo eso permitía que más gente
          	entrara al formato sin tener que vender un riñón para armar un
          	mazo decente.
        	</p>
        	<p>
          	<b className="text-white">Volcán Proxies</b> nace para expandir
          	eso a la comunidad chilena. Quiero que más jugadores puedan probar
          	mazos, hacer playtests serios, jugar con cartas que cuestan miles
          	de dólares sin tener que pagarlos, y enfocarse en lo que importa:{" "}
          	<b className="text-[#FF4D1A]">jugar y disfrutar el formato</b>.
        	</p>
        	<p>
          	Si te gusta cEDH, Commander casual, Modern, Legacy o cualquier
          	formato que permita playtest cards, esto es para ti.
        	</p>
      	</div>
    	</Reveal>

    	<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      	<Reveal delay={0} className="glass-card glow-hover p-6 rounded-xl text-center">
        	<Printer className="mx-auto text-[#FF4D1A] mb-3" size={32} />
        	<h3 className="font-display font-bold mb-2">Impresión premium</h3>
        	<p className="text-sm text-gray-400">
          	Papel fotográfico + laminado en calor para que se sientan como
          	cartas reales.
        	</p>
      	</Reveal>
      	<Reveal delay={0.08} className="glass-card glow-hover p-6 rounded-xl text-center">
        	<Flame className="mx-auto text-[#FF4D1A] mb-3" size={32} />
        	<h3 className="font-display font-bold mb-2">Hecho en Pucón</h3>
        	<p className="text-sm text-gray-400">
          	Producción artesanal desde el sur de Chile, despacho a todo el
          	país.
        	</p>
      	</Reveal>
      	<Reveal delay={0.16} className="glass-card glow-hover p-6 rounded-xl text-center">
        	<Users className="mx-auto text-[#FF4D1A] mb-3" size={32} />
        	<h3 className="font-display font-bold mb-2">Para la comunidad</h3>
        	<p className="text-sm text-gray-400">
          	Precios justos para que jugar sea accesible para todos.
        	</p>
      	</Reveal>
    	</div>

    	<Reveal className="bg-gradient-to-r from-[#FF4D1A]/20 to-transparent p-8 rounded-xl border border-[#FF4D1A]/30">
      	<h2 className="font-display font-bold text-2xl mb-3">¿Cómo funciona?</h2>
      	<ol className="space-y-3 text-gray-200">
        	<li>
          	<b className="text-[#FF4D1A]">1.</b> Eliges tus cartas desde
          	nuestro catálogo conectado a Scryfall (con todos los artes
          	disponibles).
        	</li>
        	<li>
          	<b className="text-[#FF4D1A]">2.</b> Eliges el acabado: Glossy
          	(brillante) o Matte (mate, sin reflejo).
        	</li>
        	<li>
          	<b className="text-[#FF4D1A]">3.</b> Pagas por transferencia y en{" "}
          	<b>48 horas</b> dejamos tu pedido despachado vía
          	Starken/Chilexpress.
        	</li>
        	<li>
          	<b className="text-[#FF4D1A]">4.</b> Te enviamos el número de
          	seguimiento por correo para que las sigas hasta tu puerta.
        	</li>
      	</ol>
    	</Reveal>
  	</section>

  	<Footer />
	</main>
  );
}
