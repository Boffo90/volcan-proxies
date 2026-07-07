import { Flame, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
	<footer className="bg-[#1E242B] border-t border-white/10 mt-16">
  	<div className="max-w-6xl mx-auto px-6 py-12">
    	<div className="grid md:grid-cols-4 gap-8 mb-8">
      	<div className="md:col-span-1">
        	<div className="flex items-center gap-2 mb-3">
          	<Flame className="text-[#FF4D1A]" size={24} />
          	<span className="font-bold text-lg">
            	VOLCÁN <span className="text-[#FF4D1A]">PROXIES</span>
          	</span>
        	</div>
        	<p className="text-sm text-gray-400 mb-4">
          	Proxies de calidad, hechas en Pucón.
        	</p>
        	<p className="text-xs text-gray-500 italic">
          	Que ganes por jugar contra mí, no contra mi billetera.
        	</p>
      	</div>

      	<div>
        	<h3 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-300">
          	Tienda
        	</h3>
        	<ul className="space-y-2 text-sm">
          	<li>
            	<a
              	href="/catalogo"
              	className="text-gray-400 hover:text-[#FF4D1A]"
            	>
              	Catálogo MTG
            	</a>
          	</li>
          	<li>
            	<a
              	href="/promos"
              	className="text-gray-400 hover:text-[#FF4D1A]"
            	>
              	Promociones
            	</a>
          	</li>
          	<li>
            	<a
              	href="/customs"
              	className="text-gray-400 hover:text-[#FF4D1A]"
            	>
              	Galería Custom
            	</a>
          	</li>
          	<li>
            	<a
              	href="/custom"
              	className="text-gray-400 hover:text-[#FF4D1A]"
            	>
              	Sube tu diseño
            	</a>
          	</li>
        	</ul>
      	</div>

      	<div>
        	<h3 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-300">
          	Empresa
        	</h3>
        	<ul className="space-y-2 text-sm">
          	<li>
            	<a
              	href="/nosotros"
              	className="text-gray-400 hover:text-[#FF4D1A]"
            	>
              	Sobre nosotros
            	</a>
          	</li>
          	<li>
            	<a href="/faq" className="text-gray-400 hover:text-[#FF4D1A]">
              	Preguntas frecuentes
            	</a>
          	</li>
        	</ul>
      	</div>

      	<div>
        	<h3 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-300">
          	Contacto
        	</h3>
        	<ul className="space-y-2 text-sm">
          	<li className="flex items-center gap-2 text-gray-400">
            	<MapPin size={14} /> Pucón, Chile
          	</li>
          	<li className="flex items-center gap-2 text-gray-400">
            	<Mail size={14} /> smyanezo@gmail.com
          	</li>
          	<li className="flex items-center gap-2 text-gray-400">
            	<svg
              	width="14"
              	height="14"
              	viewBox="0 0 24 24"
              	fill="none"
              	stroke="currentColor"
              	strokeWidth="2"
              	strokeLinecap="round"
              	strokeLinejoin="round"
            	>
              	<rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
              	<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              	<line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
            	</svg>
            	<a
              	href="https://instagram.com/volcanproxies"
              	target="_blank"
              	rel="noreferrer"
              	className="hover:text-[#FF4D1A]"
            	>
              	@volcanproxies
            	</a>
          	</li>
          	<li className="flex items-center gap-2 text-gray-400">
            	<svg
              	width="14"
              	height="14"
              	viewBox="0 0 24 24"
              	fill="currentColor"
            	>
              	<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
            	</svg>
            	<a
              	href="https://tiktok.com/@volcanproxies"
              	target="_blank"
              	rel="noreferrer"
              	className="hover:text-[#FF4D1A]"
            	>
              	@volcanproxies
            	</a>
          	</li>
        	</ul>
      	</div>
    	</div>

    	<div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
      	<p className="text-xs text-gray-500">
        	© {new Date().getFullYear()} Volcán Proxies · Hecho en Pucón, Chile
        	🌋
      	</p>
      	<div className="flex items-center gap-3 text-xs text-gray-500">
        	<span>Métodos de pago:</span>
        	<span className="bg-white/5 px-2 py-1 rounded">Transferencia</span>
        	<span className="bg-white/5 px-2 py-1 rounded">Flow.cl</span>
      	</div>
    	</div>
  	</div>
	</footer>
  );
}

