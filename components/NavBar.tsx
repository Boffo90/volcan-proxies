"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search, ShoppingCart, Menu, X, Flame, User } from "lucide-react";
import { autocomplete } from "@/lib/scryfall";
import { getCart } from "@/lib/cart";
import { useUser } from "@/hooks/useUser";
import CartDrawer from "@/components/CartDrawer";

export default function NavBar() {
  const router = useRouter();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [cartCount, setCartCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
	const updateCount = () => {
  	const cart = getCart();
  	setCartCount(cart.reduce((s, i) => s + i.quantity, 0));
	};
	updateCount();
	window.addEventListener("cart-updated", updateCount);
	return () => window.removeEventListener("cart-updated", updateCount);
  }, []);

  useEffect(() => {
	if (debounceRef.current) clearTimeout(debounceRef.current);
	if (!query.trim() || query.length < 2) {
  	setSuggestions([]);
  	setActiveIdx(-1);
  	return;
	}
	debounceRef.current = setTimeout(async () => {
  	const data = await autocomplete(query);
  	setSuggestions(data.slice(0, 8));
  	setActiveIdx(-1);
	}, 200);
  }, [query]);

  useEffect(() => {
	const handler = (e: MouseEvent) => {
  	if (
    	containerRef.current &&
    	!containerRef.current.contains(e.target as Node)
  	) {
    	setShowSuggestions(false);
    	setActiveIdx(-1);
  	}
	};
	document.addEventListener("mousedown", handler);
	return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
	if (activeIdx >= 0 && itemsRef.current[activeIdx]) {
  	itemsRef.current[activeIdx]?.scrollIntoView({ block: "nearest" });
	}
  }, [activeIdx]);

  const goSearch = (q: string) => {
	setShowSuggestions(false);
	setActiveIdx(-1);
	setQuery("");
	router.push("/catalogo?q=" + encodeURIComponent(q));
  };

  const handleSubmit = (e: React.FormEvent) => {
	e.preventDefault();
	if (activeIdx >= 0 && suggestions[activeIdx]) {
  	goSearch(suggestions[activeIdx]);
	} else if (query.trim()) {
  	goSearch(query.trim());
	}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
	if (!showSuggestions || suggestions.length === 0) return;
	if (e.key === "ArrowDown") {
  	e.preventDefault();
  	setActiveIdx((prev) => (prev + 1) % suggestions.length);
	} else if (e.key === "ArrowUp") {
  	e.preventDefault();
  	setActiveIdx((prev) =>
    	prev <= 0 ? suggestions.length - 1 : prev - 1
  	);
	} else if (e.key === "Escape") {
  	e.preventDefault();
  	setShowSuggestions(false);
  	setActiveIdx(-1);
	} else if (e.key === "Tab" && activeIdx >= 0) {
  	e.preventDefault();
  	setQuery(suggestions[activeIdx]);
  	setActiveIdx(-1);
	}
  };

  const navLinks = [
	{ slug: "catalogo", label: "Catálogo" },
	{ slug: "importar", label: "Importar lista" },
	{ slug: "promos", label: "Promos" },
	{ slug: "customs", label: "Galería Custom" },
	{ slug: "custom", label: "Sube tu diseño" },
	{ slug: "nosotros", label: "Nosotros" },
  ];

  return (
	<>
  	<nav className="bg-[#0b0d11]/90 md:bg-[#0b0d11]/70 backdrop-blur-sm md:backdrop-blur-xl border-b border-white/10 sticky top-0 z-30">
    	<div className="flex items-center px-4 md:px-6 py-3 gap-3">
      	<button
        	onClick={() => router.push("/")}
        	className="flex items-center gap-2 flex-shrink-0 group"
      	>
        	<Flame
          	className="text-[#FF4D1A] drop-shadow-[0_0_8px_rgba(255,79,26,0.7)] group-hover:scale-110 transition-transform"
          	size={26}
        	/>
        	<span className="font-display font-extrabold text-lg tracking-wide hidden sm:inline">
          	VOLCÁN <span className="text-lava">PROXIES</span>
        	</span>
      	</button>

      	<div
        	ref={containerRef}
        	className="flex-1 max-w-md relative hidden md:block"
      	>
        	<form onSubmit={handleSubmit} className="relative">
          	<Search
            	className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            	size={16}
          	/>
          	<input
            	value={query}
            	onChange={(e) => {
              	setQuery(e.target.value);
              	setShowSuggestions(true);
            	}}
            	onFocus={() => setShowSuggestions(true)}
            	onKeyDown={handleKeyDown}
            	placeholder="Busca una carta..."
            	className="w-full glass-card rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#FF4D1A]/60 transition-colors"
            	aria-autocomplete="list"
            	aria-expanded={showSuggestions && suggestions.length > 0}
          	/>
        	</form>
        	{showSuggestions && suggestions.length > 0 && (
          	<div
            	role="listbox"
            	className="absolute top-full left-0 right-0 mt-1 glass-card !bg-[#0b0d11]/95 rounded-lg shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
          	>
            	{suggestions.map((s, idx) => {
              	const isActive = idx === activeIdx;
              	return (
                	<button
                  	key={s}
                  	ref={(el) => {
                    	itemsRef.current[idx] = el;
                  	}}
                  	role="option"
                  	aria-selected={isActive}
                  	onMouseEnter={() => setActiveIdx(idx)}
                  	onClick={() => goSearch(s)}
                  	className={
                    	"w-full text-left px-4 py-2 text-sm transition " +
                    	(isActive
                      	? "bg-[#FF4D1A]/30 text-white"
                      	: "hover:bg-[#FF4D1A]/10")
                  	}
                	>
                  	{s}
                	</button>
              	);
            	})}
            	<div className="px-4 py-1.5 text-[10px] text-gray-500 border-t border-white/5 bg-[#0F1115]/50">
              	↑↓ navegar · Enter seleccionar · Esc cerrar
            	</div>
          	</div>
        	)}
      	</div>

      	<div className="hidden lg:flex gap-6 text-sm flex-shrink-0">
        	{navLinks.map((n) => (
          	<button
            	key={n.slug}
            	onClick={() => router.push("/" + n.slug)}
            	className="relative py-1 text-gray-300 hover:text-white transition-colors group"
          	>
            	{n.label}
            	<span className="absolute left-0 -bottom-0.5 h-[1.5px] w-0 bg-[#FF4D1A] shadow-[0_0_8px_rgba(255,79,26,0.8)] transition-all duration-300 group-hover:w-full" />
          	</button>
        	))}
      	</div>

      	<button
        	onClick={() => router.push(user ? "/mi-cuenta" : "/login")}
        	className="hidden sm:flex items-center gap-2 text-sm text-gray-300 hover:text-white glass-card hover:border-[#FF4D1A]/40 px-3 py-2 rounded-lg flex-shrink-0 ml-auto transition-colors"
      	>
        	<User size={18} />
        	{user ? "Mi cuenta" : "Iniciar sesión"}
      	</button>

      	<button
        	onClick={() => setDrawerOpen(true)}
        	className="relative bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold flex-shrink-0 sm:ml-0 ml-auto shadow-[0_4px_20px_-4px_rgba(255,79,26,0.6)] transition-all"
      	>
        	<ShoppingCart size={18} />
        	<span className="hidden sm:inline">Carrito</span>
        	{cartCount > 0 && (
          	<motion.span
            	key={cartCount}
            	initial={{ scale: 1.4 }}
            	animate={{ scale: 1 }}
            	transition={{ type: "spring", stiffness: 500, damping: 15 }}
            	className="absolute -top-2 -right-2 bg-white text-[#FF4D1A] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
          	>
            	{cartCount}
          	</motion.span>
        	)}
      	</button>

      	<button
        	onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        	className="lg:hidden"
      	>
        	{mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      	</button>
    	</div>

    	<div className="md:hidden px-4 pb-3">
      	<form onSubmit={handleSubmit} className="relative">
        	<Search
          	className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          	size={16}
        	/>
        	<input
          	value={query}
          	onChange={(e) => setQuery(e.target.value)}
          	onKeyDown={handleKeyDown}
          	placeholder="Busca una carta..."
          	className="w-full glass-card rounded-lg pl-9 pr-3 py-2 text-sm"
        	/>
      	</form>
    	</div>

    	{mobileMenuOpen && (
      	<div className="lg:hidden border-t border-white/10 bg-[#0b0d11]/95 backdrop-blur-xl">
        	<div className="flex flex-col py-2">
          	{navLinks.map((n) => (
            	<button
              	key={n.slug}
              	onClick={() => {
                	setMobileMenuOpen(false);
                	router.push("/" + n.slug);
              	}}
              	className="text-left px-6 py-3 hover:bg-white/5"
            	>
              	{n.label}
            	</button>
          	))}
          	<button
            	onClick={() => {
              	setMobileMenuOpen(false);
              	router.push(user ? "/mi-cuenta" : "/login");
            	}}
            	className="text-left px-6 py-3 hover:bg-white/5"
          	>
            	{user ? "Mi cuenta" : "Iniciar sesión"}
          	</button>
        	</div>
      	</div>
    	)}
  	</nav>

  	<CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
	</>
  );
}

