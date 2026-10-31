"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, KeyRound, Flame } from "lucide-react";
import NavBar from "@/components/NavBar";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { normalizarEmail } from "@/lib/authErrores";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();
	setLoading(true);
	const sb = supabaseBrowser();
	await sb.auth.resetPasswordForEmail(normalizarEmail(email), {
  	redirectTo: `${window.location.origin}/auth/callback?next=/actualizar-password`,
	});
	setLoading(false);
	// Se avisa lo mismo exista o no la cuenta: decir "ese email no está
	// registrado" le confirma a cualquiera quién tiene cuenta acá.
	setEnviado(true);
  };

  return (
	<main className="min-h-screen bg-surface text-ink-soft">
  	<NavBar />
  	<div className="max-w-sm mx-auto px-6 py-16">
    	<div className="flex items-center gap-2 mb-8">
      	<Flame className="text-flame-ink " size={28} />
      	<h1 className="font-display font-extrabold text-2xl">
        	Recuperar contraseña
      	</h1>
    	</div>

    	{enviado ? (
      	<div className="glass-card p-6 rounded-xl text-center space-y-3">
        	<p className="text-ink-soft">
          	Si hay una cuenta con <b className="text-ink">{email}</b>, le
          	mandamos un enlace para cambiar la contraseña.
        	</p>
        	<p className="text-xs text-ink-faint">
          	Revisa la carpeta de spam, y ábrelo en{" "}
          	<b>este mismo navegador</b>.
        	</p>
      	</div>
    	) : (
      	<form
        	onSubmit={handleSubmit}
        	className="glass-card p-6 rounded-xl space-y-4"
      	>
        	<p className="text-sm text-ink-muted">
          	Escribe tu email y te mandamos un enlace para elegir una
          	contraseña nueva.
        	</p>
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

        	<button
          	type="submit"
          	disabled={loading}
          	className="w-full btn-flame py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        	>
          	{loading ? (
            	<Loader2 className="animate-spin" size={18} />
          	) : (
            	<KeyRound size={18} />
          	)}
          	Enviar enlace
        	</button>

        	<p className="text-sm text-ink-muted text-center">
          	<Link href="/login" className="text-flame-ink hover:underline">
            	Volver a iniciar sesión
          	</Link>
        	</p>
      	</form>
    	)}
  	</div>
	</main>
  );
}
