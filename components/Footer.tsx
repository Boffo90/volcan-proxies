import { ArrowUpRight, Flame, Mail, MapPin, Store } from "lucide-react";

export default function Footer() {
  return (
	<footer className="relative bg-surface-3 border-t border-line mt-16 overflow-hidden">
  	<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-flame to-transparent" />
  	<div className="max-w-6xl mx-auto px-6 py-12 relative">
    	<div className="grid md:grid-cols-4 gap-8 mb-8">
      	<div className="md:col-span-1">
        	<div className="flex items-center gap-2 mb-3">
          	<Flame
            	className="text-flame-ink "
            	size={24}
          	/>
          	<span className="font-display font-extrabold text-lg">
            	VOLCÁN <span className="text-lava">PROXIES</span>
          	</span>
        	</div>
        	<p className="text-sm text-ink-muted mb-4">
          	Proxies de calidad, hechas en Pucón.
        	</p>
        	<p className="text-xs text-ink-faint italic">
          	Que ganes por jugar contra mí, no contra mi billetera.
        	</p>

        	{/* El cruce a la otra tienda. En el footer porque acá llega quien
            	ya recorrió el sitio y no encontró lo que buscaba; el banner de
            	la portada agarra al que se va antes. Azul de maná, igual que
            	allá, para que no se confunda con una sección de Volcán. */}
        	<a
          	href="https://proxiesabudabi.cl"
          	target="_blank"
          	rel="noopener"
          	className="mt-5 inline-flex items-start gap-2.5 rounded-xl border-2 border-line bg-surface-2 p-3 transition-colors hover:border-ink"
        	>
          	<Store size={16} className="text-mana-u mt-0.5 shrink-0" />
          	<span className="text-xs text-ink-muted">
            	¿Buscas foil, holo o serialized? Los importamos en{" "}
            	{/* La flecha pegada a la ultima palabra: suelta se caia sola
                	a una tercera linea en la columna angosta del footer. */}
            	<b className="text-ink">
              	Proxies Abu{" "}
              	<span className="whitespace-nowrap">
                	Dabi
                	<ArrowUpRight size={12} className="inline ml-0.5 -mt-0.5" />
              	</span>
            	</b>
          	</span>
        	</a>
      	</div>

      	<div>
        	<h3 className="font-bold mb-3 text-sm uppercase tracking-wide text-ink-soft">
          	Tienda
        	</h3>
        	<ul className="space-y-2 text-sm">
          	<li>
            	<a
              	href="/catalogo"
              	className="text-ink-muted hover:text-flame-ink"
            	>
              	Catálogo MTG
            	</a>
          	</li>
          	<li>
            	<a
              	href="/promos"
              	className="text-ink-muted hover:text-flame-ink"
            	>
              	Promociones
            	</a>
          	</li>
          	<li>
            	<a
              	href="/customs"
              	className="text-ink-muted hover:text-flame-ink"
            	>
              	Galería Custom
            	</a>
          	</li>
          	<li>
            	<a
              	href="/custom"
              	className="text-ink-muted hover:text-flame-ink"
            	>
              	Sube tu diseño
            	</a>
          	</li>
        	</ul>
      	</div>

      	<div>
        	<h3 className="font-bold mb-3 text-sm uppercase tracking-wide text-ink-soft">
          	Empresa
        	</h3>
        	<ul className="space-y-2 text-sm">
          	<li>
            	<a
              	href="/nosotros"
              	className="text-ink-muted hover:text-flame-ink"
            	>
              	Sobre nosotros
            	</a>
          	</li>
          	<li>
            	<a href="/faq" className="text-ink-muted hover:text-flame-ink">
              	Preguntas frecuentes
            	</a>
          	</li>
        	</ul>
      	</div>

      	<div>
        	<h3 className="font-bold mb-3 text-sm uppercase tracking-wide text-ink-soft">
          	Contacto
        	</h3>
        	<ul className="space-y-2 text-sm">
          	<li className="flex items-center gap-2 text-ink-muted">
            	<MapPin size={14} /> Pucón, Chile
          	</li>
          	<li className="flex items-center gap-2 text-ink-muted">
            	<Mail size={14} /> volcanproxies@gmail.com
          	</li>
          	<li className="flex items-center gap-2 text-ink-muted">
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
              	className="hover:text-flame-ink"
            	>
              	@volcanproxies
            	</a>
          	</li>
          	<li className="flex items-center gap-2 text-ink-muted">
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
              	className="hover:text-flame-ink"
            	>
              	@volcanproxies
            	</a>
          	</li>
        	</ul>
      	</div>
    	</div>

    	<div className="border-t border-line pt-6 flex flex-wrap items-center justify-between gap-4">
      	<p className="text-xs text-ink-faint">
        	© {new Date().getFullYear()} Volcán Proxies · Hecho en Pucón, Chile
        	🌋
      	</p>
      	<div className="flex items-center gap-3 text-xs text-ink-faint">
        	<span>Métodos de pago:</span>
        	<span className="glass-card px-2 py-1 rounded">Transferencia</span>
        	<span className="glass-card px-2 py-1 rounded">Flow.cl</span>
      	</div>
    	</div>
  	</div>
	</footer>
  );
}

