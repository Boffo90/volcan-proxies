"use client";

/**
 * Segundo tramo de la recuperación: acá llega el usuario después de que el
 * callback canjeó el código del correo por una sesión. Esa sesión ya lo
 * autentica, así que `updateUser` puede cambiarle la contraseña sin pedirle
 * la anterior — que es justo la que no recuerda.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, Flame } from "lucide-react";
import NavBar from "@/components/NavBar";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useUser } from "@/hooks/useUser";

export default function ActualizarPasswordPage() {
  const router = useRouter();
  const { user, loading: cargandoUser } = useUser();
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  // Sin sesión no hay nada que actualizar: es alguien que llegó a la URL sin
  // pasar por el correo, o cuyo enlace ya venció.
  useEffect(() => {
	if (!cargandoUser && !user && !listo) {
  	router.replace("/recuperar");
	}
  }, [cargandoUser, user, listo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();
	if (password.length < 6) {
  	setError("La contraseña debe tener al menos 6 caracteres");
  	return;
	}
	if (password !== repetir) {
  	setError("Las dos contraseñas no son iguales");
  	return;
	}
	setLoading(true);
	setError("");
	const sb = supabaseBrowser();
	const { error } = await sb.auth.updateUser({ password });
	setLoading(false);
	if (error) {
  	setError(error.message);
  	return;
	}
	setListo(true);
	setTimeout(() => {
  	router.push("/mi-cuenta");
  	router.refresh();
	}, 1500);
  };

  if (cargandoUser) {
	return (
  	<main className="min-h-screen bg-[#0b0d11] text-white flex justify-center py-32">
    	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
  	</main>
	);
  }

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />
  	<div className="max-w-sm mx-auto px-6 py-16">
    	<div className="flex items-center gap-2 mb-8">
      	<Flame className="text-[#FF4D1A] drop-shadow-[0_0_8px_rgba(255,79,26,0.7)]" size={28} />
      	<h1 className="font-display font-extrabold text-2xl">
        	Nueva contraseña
      	</h1>
    	</div>

    	{listo ? (
      	<div className="glass-card p-6 rounded-xl text-center">
        	<p className="text-green-400">
          	Listo, contraseña cambiada. Te llevamos a tu cuenta.
        	</p>
      	</div>
    	) : (
      	<form
        	onSubmit={handleSubmit}
        	className="glass-card p-6 rounded-xl space-y-4"
      	>
        	<div>
          	<label className="block text-sm font-semibold mb-1.5">
            	Contraseña nueva
          	</label>
          	<input
            	type="password"
            	required
            	value={password}
            	onChange={(e) => setPassword(e.target.value)}
            	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
          	/>
        	</div>
        	<div>
          	<label className="block text-sm font-semibold mb-1.5">
            	Repítela
          	</label>
          	<input
            	type="password"
            	required
            	value={repetir}
            	onChange={(e) => setRepetir(e.target.value)}
            	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
          	/>
        	</div>

        	{error ? <p className="text-sm text-red-400">{error}</p> : null}

        	<button
          	type="submit"
          	disabled={loading}
          	className="w-full bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 py-2.5 rounded-lg font-semibold shadow-[0_4px_20px_-4px_rgba(255,79,26,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        	>
          	{loading ? (
            	<Loader2 className="animate-spin" size={18} />
          	) : (
            	<KeyRound size={18} />
          	)}
          	Guardar contraseña
        	</button>
      	</form>
    	)}
  	</div>
	</main>
  );
}
