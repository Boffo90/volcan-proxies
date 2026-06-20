"use client";
import { Flame } from "lucide-react";

export default function NavBar() {
  return (
	<nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0F1115] sticky top-0 z-50">
  	<a href="/" className="flex items-center gap-2">
    	<Flame className="text-[#FF4D1A]" size={28} />
    	<span className="font-bold text-xl tracking-wide">
      	VOLCÁN <span className="text-[#FF4D1A]">PROXIES</span>
    	</span>
  	</a>

  	<div className="hidden md:flex gap-6 text-sm">
    	<a href="/catalogo" className="hover:text-[#FF4D1A] transition">
      	Catálogo
    	</a>
    	<a href="/promos" className="hover:text-[#FF4D1A] transition">
      	Promos
    	</a>
    	<a href="/custom" className="hover:text-[#FF4D1A] transition">
      	Custom
    	</a>
    	<a href="/nosotros" className="hover:text-[#FF4D1A] transition">
      	Nosotros
    	</a>
  	</div>

  	<a
    	href="/carrito"
    	className="bg-[#FF4D1A] hover:bg-[#e64418] px-4 py-2 rounded-lg text-sm font-semibold transition"
  	>
    	Carrito
  	</a>
	</nav>
  );
}

