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
	<main className="min-h-screen bg-[#0F1115] text-white flex items-center justify-center p-6">
  	<div className="w-full max-w-sm">
    	<div className="flex items-center justify-center gap-2 mb-8">
      	<Flame className="text-[#FF4D1A]" size={32} />
      	<h1 className="font-bold text-2xl">
        	VOLCÁN <span className="text-[#FF4D1A]">ADMIN</span>
      	</h1>
    	</div>
    	<form
      	onSubmit={handleSubmit}
      	className="bg-[#1E242B] p-6 rounded-xl border border-white/10"
    	>
      	<label className="text-sm font-semibold mb-2 flex items-center gap-2">
        	<Lock size={16} /> Contraseña
      	</label>
      	<input
        	type="password"
        	value={password}
        	onChange={(e) => setPassword(e.target.value)}
        	autoFocus
        	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 mb-4 mt-2 focus:outline-none focus:border-[#FF4D1A]"
      	/>
      	{error ? (
        	<p className="text-sm text-red-400 mb-4">{error}</p>
      	) : null}
      	<button
        	type="submit"
        	disabled={loading}
        	className="w-full bg-[#FF4D1A] hover:bg-[#e64418] py-2.5 rounded-lg font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
      	>
        	{loading ? <Loader2 className="animate-spin" size={18} /> : null}
        	Ingresar
      	</button>
    	</form>
  	</div>
	</main>
  );
}

