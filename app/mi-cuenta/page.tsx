"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Package, User as UserIcon } from "lucide-react";
import NavBar from "@/components/NavBar";
import { useUser } from "@/hooks/useUser";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { formatCLP } from "@/lib/pricing";

type Pedido = {
  id: string;
  numero: number;
  total: number;
  estado: string;
  metodo_pago: string;
  created_at: string;
};

const ESTADO_LABEL: Record<string, string> = {
  recibido: "Recibido",
  pagado: "Pagado",
  imprimiendo: "Imprimiendo",
  laminando: "Laminando",
  enviado: "Enviado",
  entregado: "Entregado",
};

export default function MiCuentaPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useUser();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  useEffect(() => {
	if (!loadingUser && !user) {
  	router.push("/login");
	}
  }, [loadingUser, user, router]);

  useEffect(() => {
	if (!user) return;
	fetch("/api/mis-pedidos")
  	.then((res) => res.json())
  	.then((data) => setPedidos(data.pedidos || []))
  	.finally(() => setLoadingPedidos(false));
  }, [user]);

  const handleLogout = async () => {
	const sb = supabaseBrowser();
	await sb.auth.signOut();
	router.push("/");
	router.refresh();
  };

  if (loadingUser || !user) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white">
    	<NavBar />
    	<div className="flex items-center justify-center py-32">
      	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
    	</div>
  	</main>
	);
  }

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />
  	<div className="max-w-3xl mx-auto px-6 py-10">
    	<div className="flex items-center justify-between mb-8">
      	<div className="flex items-center gap-3">
        	<div className="bg-[#FF4D1A]/20 p-3 rounded-full">
          	<UserIcon className="text-[#FF4D1A]" size={24} />
        	</div>
        	<div>
          	<h1 className="text-xl font-bold">Mi cuenta</h1>
          	<p className="text-sm text-gray-400">{user.email}</p>
        	</div>
      	</div>
      	<button
        	onClick={handleLogout}
        	className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition"
      	>
        	<LogOut size={16} /> Cerrar sesión
      	</button>
    	</div>

    	<h2 className="font-bold text-lg mb-4 flex items-center gap-2">
      	<Package size={18} className="text-[#FF4D1A]" /> Mis pedidos
    	</h2>

    	{loadingPedidos ? (
      	<div className="flex justify-center py-12">
        	<Loader2 className="animate-spin text-[#FF4D1A]" size={24} />
      	</div>
    	) : pedidos.length === 0 ? (
      	<div className="bg-[#1E242B] border border-white/10 rounded-xl p-8 text-center">
        	<p className="text-gray-400 mb-4">Aún no tienes pedidos.</p>
        	<button
          	onClick={() => router.push("/catalogo")}
          	className="bg-[#FF4D1A] hover:bg-[#e64418] px-5 py-2.5 rounded-lg font-semibold transition"
        	>
          	Explorar catálogo
        	</button>
      	</div>
    	) : (
      	<div className="space-y-3">
        	{pedidos.map((p) => (
          	<button
            	key={p.id}
            	onClick={() => router.push("/seguimiento/" + p.numero)}
            	className="w-full flex items-center justify-between bg-[#1E242B] border border-white/10 hover:border-[#FF4D1A]/50 rounded-xl p-4 transition text-left"
          	>
            	<div>
              	<p className="font-semibold">Pedido #{p.numero}</p>
              	<p className="text-xs text-gray-400">
                	{new Date(p.created_at).toLocaleDateString("es-CL")} ·{" "}
                	{p.metodo_pago === "flow" ? "Flow.cl" : "Transferencia"}
              	</p>
            	</div>
            	<div className="text-right">
              	<p className="font-bold text-[#FF4D1A]">
                	{formatCLP(p.total)}
              	</p>
              	<p className="text-xs text-gray-400">
                	{ESTADO_LABEL[p.estado] || p.estado}
              	</p>
            	</div>
          	</button>
        	))}
      	</div>
    	)}
  	</div>
	</main>
  );
}
