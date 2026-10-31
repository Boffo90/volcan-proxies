"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Flame } from "lucide-react";
import NavBar from "@/components/NavBar";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { normalizarEmail, traducirErrorAuth } from "@/lib/authErrores";

export default function RegistroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  const handleReenviar = async () => {
	setReenviando(true);
	const sb = supabaseBrowser();
	await sb.auth.resend({
  	type: "signup",
  	email: normalizarEmail(email),
  	options: {
    	emailRedirectTo: `${window.location.origin}/auth/callback?next=/mi-cuenta`,
  	},
	});
	setReenviando(false);
	setReenviado(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();
	if (password.length < 6) {
  	setError("La contraseña debe tener al menos 6 caracteres");
  	return;
	}
	setLoading(true);
	setError("");
	// El campo puede traer caracteres invisibles pegados por el
	// autocompletado del teléfono. Supabase los rechaza por formato y el
	// cliente no tiene cómo verlos para corregirlos.
	const limpio = normalizarEmail(email);
	const sb = supabaseBrowser();
	// Sin `emailRedirectTo` el enlace del correo cae en la Site URL del
	// proyecto, que no canjea el código. Tiene que apuntar al callback.
	const { data, error } = await sb.auth.signUp({
  	email: limpio,
  	password,
  	options: {
    	emailRedirectTo: `${window.location.origin}/auth/callback?next=/mi-cuenta`,
  	},
	});
	setLoading(false);
	if (error) {
  	setError(traducirErrorAuth(error).mensaje);
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
	<main className="min-h-screen bg-surface text-ink-soft">
  	<NavBar />
  	<div className="max-w-sm mx-auto px-6 py-16">
    	<div className="flex items-center gap-2 mb-8">
      	<Flame className="text-flame-ink " size={28} />
      	<h1 className="font-display font-extrabold text-2xl">Crear cuenta</h1>
    	</div>

    	{done ? (
      	<div className="glass-card p-6 rounded-xl text-center space-y-3">
        	<p className="text-ink-soft">
          	Te mandamos un correo a <b className="text-ink">{email}</b>.
          	Ábrelo para confirmar tu cuenta antes de iniciar sesión.
        	</p>
        	<p className="text-xs text-ink-faint">
          	Revisa también la carpeta de spam. Abre el enlace en{" "}
          	<b>este mismo navegador</b>: si lo abres en otro, la confirmación
          	falla y hay que pedir el correo de nuevo.
        	</p>
        	{reenviado ? (
          	<p className="text-sm text-green-700">Correo reenviado.</p>
        	) : (
          	<button
            	type="button"
            	disabled={reenviando}
            	onClick={handleReenviar}
            	className="text-sm text-flame-ink hover:underline disabled:opacity-50"
          	>
            	{reenviando ? "Reenviando…" : "No me llegó, reenviar"}
          	</button>
        	)}
      	</div>
    	) : (
      	<form
        	onSubmit={handleSubmit}
        	className="glass-card p-6 rounded-xl space-y-4"
      	>
        	<div>
          	<label className="block text-sm font-semibold mb-1.5">Email</label>
          	<input
            	type="email"
            	required
            	value={email}
            	onChange={(e) => setEmail(e.target.value)}
            	className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-flame"
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
            	className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-flame"
          	/>
        	</div>

        	{error ? <p className="text-sm text-red-700">{error}</p> : null}

        	<button
          	type="submit"
          	disabled={loading}
          	className="w-full btn-flame py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        	>
          	{loading ? (
            	<Loader2 className="animate-spin" size={18} />
          	) : (
            	<UserPlus size={18} />
          	)}
          	Crear cuenta
        	</button>

        	<p className="text-sm text-ink-muted text-center">
          	¿Ya tienes cuenta?{" "}
          	<button
            	type="button"
            	onClick={() => router.push("/login")}
            	className="text-flame-ink hover:underline"
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
