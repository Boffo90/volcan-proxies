"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Settings, RefreshCw, Flame, Palette } from "lucide-react";

type Pedido = {
  id: string;
  numero: number;
  cliente_nombre: string;
  cliente_email: string;
  total: number;
  estado: string;
  metodo_pago: string;
  created_at: string;
};

const ESTADOS = [
  { key: "recibido", label: "Recibido", color: "#3b82f6" },
  { key: "pagado", label: "Pagado", color: "#8b5cf6" },
  { key: "imprimiendo", label: "Imprimiendo", color: "#FF4D1A" },
  { key: "laminando", label: "Laminando", color: "#eab308" },
  { key: "enviado", label: "Enviado", color: "#22c55e" },
  { key: "entregado", label: "Entregado", color: "#64748b" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPedidos = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/pedidos");
	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}
	const data = await res.json();
	setPedidos(data.pedidos || []);
	setLoading(false);
  }, [router]);

  useEffect(() => {
	fetchPedidos();
  }, [fetchPedidos]);

  const logout = async () => {
	await fetch("/api/admin/logout", { method: "POST" });
	router.push("/admin/login");
  };

  const formatCLP = (n: number) =>
	new Intl.NumberFormat("es-CL", {
  	style: "currency",
  	currency: "CLP",
  	maximumFractionDigits: 0,
	}).format(n);

  const ventasMes = pedidos
	.filter((p) => {
  	const d = new Date(p.created_at);
  	const now = new Date();
  	return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
	})
	.reduce((s, p) => s + p.total, 0);

  const pendientes = pedidos.filter((p) => p.estado !== "entregado").length;

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<nav className="bg-[#1E242B] border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
    	<div className="flex items-center gap-2">
      	<Flame className="text-[#FF4D1A]" size={24} />
      	<h1 className="font-bold text-lg">
        	VOLCÁN <span className="text-[#FF4D1A]">ADMIN</span>
      	</h1>
    	</div>
    	<div className="flex items-center gap-2">
      	<button
        	onClick={fetchPedidos}
        	className="text-sm bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2"
      	>
        	<RefreshCw size={14} /> Refrescar
      	</button>
      	<button
        	onClick={() => router.push("/admin/precios")}
        	className="text-sm bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2"
      	>
        	<Settings size={14} /> Precios
      	</button>
      	<button
        	onClick={() => router.push("/admin/customs")}
        	className="text-sm bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2"
      	>
        	<Palette size={14} /> Customs
      	</button>
      	<button
        	onClick={logout}
        	className="text-sm bg-white/5 hover:bg-red-500/20 px-3 py-2 rounded-lg flex items-center gap-2"
      	>
        	<LogOut size={14} /> Salir
      	</button>
    	</div>
  	</nav>

  	<div className="px-6 py-6">
    	<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
        	<p className="text-xs text-gray-400 uppercase">Pedidos totales</p>
        	<p className="text-3xl font-bold mt-2">{pedidos.length}</p>
      	</div>
      	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
        	<p className="text-xs text-gray-400 uppercase">Pendientes</p>
        	<p className="text-3xl font-bold mt-2 text-[#FF4D1A]">{pendientes}</p>
      	</div>
      	<div className="bg-[#1E242B] p-5 rounded-xl border border-white/10">
        	<p className="text-xs text-gray-400 uppercase">Ventas del mes</p>
        	<p className="text-3xl font-bold mt-2">{formatCLP(ventasMes)}</p>
      	</div>
    	</div>

    	{loading ? (
      	<div className="flex justify-center py-16">
        	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
      	</div>
    	) : (
      	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        	{ESTADOS.map((estado) => {
          	const items = pedidos.filter((p) => p.estado === estado.key);
          	const colBg = estado.color + "22";
          	const colText = estado.color;
          	return (
            	<div
              	key={estado.key}
              	className="bg-[#1E242B] rounded-xl border border-white/10 overflow-hidden flex flex-col"
            	>
              	<div
                	className="px-3 py-2 text-xs font-bold uppercase tracking-wide"
                	style={{ backgroundColor: colBg, color: colText }}
              	>
                	{estado.label} ({items.length})
              	</div>
              	<div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[600px]">
                	{items.length === 0 ? (
                  	<p className="text-xs text-gray-500 text-center py-4">—</p>
                	) : null}
                	{items.map((p) => (
                  	<button
                    	key={p.id}
                    	onClick={() => router.push("/admin/pedido/" + p.id)}
                    	className="w-full text-left bg-[#0F1115] p-3 rounded-lg border border-white/5 hover:border-[#FF4D1A]/50 transition"
                  	>
                    	<p className="text-xs text-gray-400 mb-1">
                      	#{p.numero} ·{" "}
                      	{new Date(p.created_at).toLocaleDateString("es-CL")}
                    	</p>
                    	<p className="text-sm font-semibold truncate">
                      	{p.cliente_nombre}
                    	</p>
                    	<p className="text-xs text-gray-400 truncate">
                      	{p.cliente_email}
                    	</p>
                    	<div className="flex justify-between items-center mt-2">
                      	<span className="text-xs text-gray-500 capitalize">
                        	{p.metodo_pago}
                      	</span>
                      	<span className="text-sm font-bold text-[#FF4D1A]">
                        	{formatCLP(p.total)}
                      	</span>
                    	</div>
                  	</button>
                	))}
              	</div>
            	</div>
          	);
        	})}
      	</div>
    	)}
  	</div>
	</main>
  );
}

