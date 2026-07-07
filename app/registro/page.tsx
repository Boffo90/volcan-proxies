"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Flame } from "lucide-react";
import NavBar from "@/components/NavBar";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function RegistroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();
	if (password.length < 6) {
  	setError("La contraseña debe tener al menos 6 caracteres");
  	return;
	}
	setLoading(true);
	setError("");
	const sb = supabaseBrowser();
	const { data, error } = await sb.auth.signUp({ email, password });
	setLoading(false);
	if (error) {
  	setError(error.message);
  	return;
	}
	if (data.session) {
  	router.push("/mi-cuenta");
  	router.refresh();
	} else {
  	setDone(true);
	}
  };

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<NavBar />
  	<div className="max-w-sm mx-auto px-6 py-16">
    	<div className="flex items-center gap-2 mb-8">
      	<Flame className="text-[#FF4D1A]" size={28} />
      	<h1 className="font-bold text-2xl">Crear cuenta</h1>
    	</div>

    	{done ? (
      	<div className="bg-[#1E242B] p-6 rounded-xl border border-white/10 text-center">
        	<p className="text-gray-300">
          	Revisa tu email para confirmar tu cuenta antes de iniciar sesión.
        	</p>
      	</div>
    	) : (
      	<form
        	onSubmit={handleSubmit}
        	className="bg-[#1E242B] p-6 rounded-xl border border-white/10 space-y-4"
      	>
        	<div>
          	<label className="block text-sm font-semibold mb-1.5">Email</label>
          	<input
            	type="email"
            	required
            	value={email}
            	onChange={(e) => setEmail(e.target.value)}
            	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
          	/>
        	</div>
        	<div>
          	<label className="block text-sm font-semibold mb-1.5">
            	Contraseña
          	</label>
          	<input
            	type="password"
            	required
            	value={password}
            	onChange={(e) => setPassword(e.target.value)}
            	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
          	/>
        	</div>

        	{error ? <p className="text-sm text-red-400">{error}</p> : null}

        	<button
          	type="submit"
          	disabled={loading}
          	className="w-full bg-[#FF4D1A] hover:bg-[#e64418] py-2.5 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
        	>
          	{loading ? (
            	<Loader2 className="animate-spin" size={18} />
          	) : (
            	<UserPlus size={18} />
          	)}
          	Crear cuenta
        	</button>

        	<p className="text-sm text-gray-400 text-center">
          	¿Ya tienes cuenta?{" "}
          	<button
            	type="button"
            	onClick={() => router.push("/login")}
            	className="text-[#FF4D1A] hover:underline"
          	>
            	Inicia sesión
          	</button>
        	</p>
      	</form>
    	)}
  	</div>
	</main>
  );
}
