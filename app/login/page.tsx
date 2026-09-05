"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn, Flame } from "lucide-react";
import NavBar from "@/components/NavBar";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sinConfirmar, setSinConfirmar] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  // El callback de los correos devuelve acá con ?error=... cuando el enlace
  // venció o no se pudo canjear. Se lee de window y no con useSearchParams
  // para no dejar la página esperando hidratación.
  useEffect(() => {
	const motivo = new URLSearchParams(window.location.search).get("error");
	if (!motivo) return;
	setError(
  	motivo === "canje_fallido"
    	? "No pudimos confirmar la cuenta. Suele pasar al abrir el correo en otro navegador: pide el enlace de nuevo desde acá y ábrelo en este mismo."
    	: motivo === "sin_codigo"
    	? "El enlace del correo llegó incompleto. Pide uno nuevo."
    	: "El enlace venció o ya se usó. Pide uno nuevo."
	);
	setSinConfirmar(true);
  }, []);

  const handleReenviar = async () => {
	if (!email) {
  	setError("Escribe tu email arriba y vuelve a apretar.");
  	return;
	}
	setReenviando(true);
	const sb = supabaseBrowser();
	await sb.auth.resend({
  	type: "signup",
  	email,
  	options: {
    	emailRedirectTo: `${window.location.origin}/auth/callback?next=/mi-cuenta`,
  	},
	});
	setReenviando(false);
	setReenviado(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();
	setLoading(true);
	setError("");
	const sb = supabaseBrowser();
	const { error } = await sb.auth.signInWithPassword({ email, password });
	setLoading(false);
	if (error) {
  	// "Email not confirmed" llegaba crudo y en inglés, que es justo el caso
  	// en que el usuario necesita saber qué hacer.
  	const noConfirmado = /not confirmed/i.test(error.message);
  	setSinConfirmar(noConfirmado);
  	setError(
    	noConfirmado
      	? "Tu cuenta todavía no está confirmada. Busca el correo que te mandamos, o pide uno nuevo acá abajo."
      	: error.message === "Invalid login credentials"
      	? "Email o contraseña incorrectos"
      	: error.message
  	);
  	return;
	}
	router.push("/mi-cuenta");
	router.refresh();
  };

  return (
	<main className="min-h-screen bg-[#0b0d11] text-white">
  	<NavBar />
  	<div className="max-w-sm mx-auto px-6 py-16">
    	<div className="flex items-center gap-2 mb-8">
      	<Flame className="text-[#FF4D1A] drop-shadow-[0_0_8px_rgba(255,79,26,0.7)]" size={28} />
      	<h1 className="font-display font-extrabold text-2xl">Iniciar sesión</h1>
    	</div>

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
          	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
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
          	className="w-full bg-[#0b0d11] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF4D1A]"
        	/>
      	</div>

      	{error ? <p className="text-sm text-red-400">{error}</p> : null}

      	{sinConfirmar ? (
        	reenviado ? (
          	<p className="text-sm text-green-400">
            	Correo enviado. Ábrelo en este mismo navegador.
          	</p>
        	) : (
          	<button
            	type="button"
            	disabled={reenviando}
            	onClick={handleReenviar}
            	className="text-sm text-[#FF4D1A] hover:underline disabled:opacity-50"
          	>
            	{reenviando ? "Enviando…" : "Reenviar correo de confirmación"}
          	</button>
        	)
      	) : null}

      	<button
        	type="submit"
        	disabled={loading}
        	className="w-full bg-gradient-to-br from-[#ff8a3d] via-[#FF4D1A] to-[#c92a1f] hover:brightness-110 py-2.5 rounded-lg font-semibold shadow-[0_4px_20px_-4px_rgba(255,79,26,0.5)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      	>
        	{loading ? (
          	<Loader2 className="animate-spin" size={18} />
        	) : (
          	<LogIn size={18} />
        	)}
        	Ingresar
      	</button>

      	<p className="text-sm text-center">
        	<Link
          	href="/recuperar"
          	className="text-gray-400 hover:text-[#FF4D1A] hover:underline"
        	>
          	Olvidé mi contraseña
        	</Link>
      	</p>

      	<p className="text-sm text-gray-400 text-center">
        	¿No tienes cuenta?{" "}
        	<button
          	type="button"
          	onClick={() => router.push("/registro")}
          	className="text-[#FF4D1A] hover:underline"
        	>
          	Crear cuenta
        	</button>
      	</p>
    	</form>
  	</div>
	</main>
  );
}
