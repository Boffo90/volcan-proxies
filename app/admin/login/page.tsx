"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Loader2, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
	e.preventDefault();
	setLoading(true);
	setError("");
	try {
  	const res = await fetch("/api/admin/login", {
    	method: "POST",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ password }),
  	});
  	if (!res.ok) {
    	const data = await res.json();
    	throw new Error(data.error || "Error");
  	}
  	router.push("/admin");
	} catch (err: unknown) {
  	const msg = err instanceof Error ? err.message : "Error";
  	setError(msg);
  	setLoading(false);
	}
  };

  return (
	<main className="min-h-screen bg-surface text-ink-soft flex items-center justify-center p-6">
  	<div className="w-full max-w-sm">
    	<div className="flex items-center justify-center gap-2 mb-8">
      	<Flame className="text-flame-ink" size={32} />
      	<h1 className="font-bold text-2xl">
        	VOLCÁN <span className="text-flame-ink">ADMIN</span>
      	</h1>
    	</div>
    	<form
      	onSubmit={handleSubmit}
      	className="bg-surface-2 p-6 rounded-xl border border-line"
    	>
      	<label className="text-sm font-semibold mb-2 flex items-center gap-2">
        	<Lock size={16} /> Contraseña
      	</label>
      	<input
        	type="password"
        	value={password}
        	onChange={(e) => setPassword(e.target.value)}
        	autoFocus
        	className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 mb-4 mt-2 focus:outline-none focus:border-flame"
      	/>
      	{error ? (
        	<p className="text-sm text-red-700 mb-4">{error}</p>
      	) : null}
      	<button
        	type="submit"
        	disabled={loading}
        	className="w-full btn-flame py-2.5 rounded-lg font-semibold transition flex items-center justify-center gap-2"
      	>
        	{loading ? <Loader2 className="animate-spin" size={18} /> : null}
        	Ingresar
      	</button>
    	</form>
  	</div>
	</main>
  );
}

