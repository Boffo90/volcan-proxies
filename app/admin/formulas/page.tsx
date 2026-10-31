"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Save,
  BookOpen,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  FORMULAS_DEFAULT,
  TAMANO_INGLES,
  TAMANO_JAPONES,
  type Formula,
} from "@/lib/formulas";

export default function AdminFormulasPage() {
  const router = useRouter();
  const [formulas, setFormulas] = useState<Formula[]>(FORMULAS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fetchFormulas = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/formulas");
	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}
	const data = await res.json();
	setFormulas(data.formulas);
	setLoading(false);
  }, [router]);

  useEffect(() => {
	fetchFormulas();
  }, [fetchFormulas]);

  const guardar = async () => {
	setSaving(true);
	try {
  	const res = await fetch("/api/admin/formulas", {
    	method: "PATCH",
    	headers: { "Content-Type": "application/json" },
    	body: JSON.stringify({ formulas }),
  	});
  	const data = await res.json();
  	if (!res.ok) {
    	alert("No se pudo guardar: " + (data.error || "error desconocido"));
    	return;
  	}
  	setFormulas(data.formulas);
  	setEditando(false);
  	setSavedAt(new Date().toLocaleTimeString("es-CL"));
	} finally {
  	setSaving(false);
	}
  };

  const set = (i: number, campo: keyof Formula, v: string) =>
	setFormulas((prev) =>
  	prev.map((f, idx) => (idx === i ? { ...f, [campo]: v } : f))
	);

  const agregar = () =>
	setFormulas((prev) => [
  	...prev,
  	{
    	id: "formula-" + Date.now().toString(36),
    	juegos: "",
    	tamano: TAMANO_INGLES,
    	variante: "Reforzada",
    	papeles: "",
    	calidad: "",
    	notas: "",
  	},
	]);

  const borrar = (i: number) => {
	if (!confirm("¿Borrar esta fórmula?")) return;
	setFormulas((prev) => prev.filter((_, idx) => idx !== i));
  };

  if (loading) {
	return (
  	<main className="min-h-screen bg-surface text-ink-soft flex justify-center py-32">
    	<Loader2 className="animate-spin text-flame-ink" size={32} />
  	</main>
	);
  }

  // Se agrupan por juego para que al producir se llegue rápido a la receta.
  const grupos: Array<[string, Formula[]]> = [];
  for (const f of formulas) {
	const g = grupos.find(([j]) => j === f.juegos);
	if (g) g[1].push(f);
	else grupos.push([f.juegos, [f]]);
  }

  return (
	<main className="min-h-screen bg-surface text-ink-soft">
  	<div className="max-w-4xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/admin")}
      	className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al panel
    	</button>

    	<div className="flex justify-between items-start gap-3 flex-wrap mb-2">
      	<h1 className="text-3xl font-bold flex items-center gap-2">
        	<BookOpen className="text-flame-ink" size={28} />
        	Fórmulas de <span className="text-flame-ink">producción</span>
      	</h1>
      	{!editando && (
        	<button
          	onClick={() => setEditando(true)}
          	className="text-sm bg-ink/5 hover:bg-ink/10 px-3 py-2 rounded-lg flex items-center gap-2 border border-line"
        	>
          	<Pencil size={14} /> Editar
        	</button>
      	)}
    	</div>
    	<p className="text-ink-muted mb-6 text-sm">
      	Con qué papel y a qué calidad se imprime cada tipo de carta. Es tu
      	referencia al producir: si cambias un proceso, actualízalo acá.
    	</p>

    	{editando ? (
      	<div className="space-y-4">
        	{formulas.map((f, i) => (
          	<div
            	key={f.id}
            	className="bg-surface-2 p-5 rounded-xl border border-line"
          	>
            	<div className="flex justify-between items-center mb-3">
              	<span className="text-xs text-ink-faint">Fórmula {i + 1}</span>
              	<button
                	onClick={() => borrar(i)}
                	className="text-red-700 hover:text-red-700"
                	aria-label="Borrar fórmula"
              	>
                	<Trash2 size={16} />
              	</button>
            	</div>
            	<div className="grid sm:grid-cols-2 gap-3">
              	{(
                	[
                  	["juegos", "Juegos"],
                  	["variante", "Variante"],
                  	["papeles", "Papel"],
                  	["calidad", "Calidad de impresión"],
                	] as Array<[keyof Formula, string]>
              	).map(([campo, label]) => (
                	<div key={campo}>
                  	<label
                    	htmlFor={`${f.id}-${campo}`}
                    	className="block text-xs text-ink-muted mb-1"
                  	>
                    	{label}
                  	</label>
                  	<input
                    	id={`${f.id}-${campo}`}
                    	value={f[campo]}
                    	onChange={(e) => set(i, campo, e.target.value)}
                    	className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm"
                  	/>
                	</div>
              	))}
              	<div>
                	<label
                  	htmlFor={`${f.id}-tamano`}
                  	className="block text-xs text-ink-muted mb-1"
                	>
                  	Tamaño
                	</label>
                	<select
                  	id={`${f.id}-tamano`}
                  	value={f.tamano}
                  	onChange={(e) => set(i, "tamano", e.target.value)}
                  	className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm"
                	>
                  	<option value={TAMANO_INGLES}>{TAMANO_INGLES}</option>
                  	<option value={TAMANO_JAPONES}>{TAMANO_JAPONES}</option>
                	</select>
              	</div>
              	<div className="sm:col-span-2">
                	<label
                  	htmlFor={`${f.id}-notas`}
                  	className="block text-xs text-ink-muted mb-1"
                	>
                  	Notas
                	</label>
                	<input
                  	id={`${f.id}-notas`}
                  	value={f.notas}
                  	onChange={(e) => set(i, "notas", e.target.value)}
                  	placeholder="Algo que convenga recordar al producirla"
                  	className="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm"
                	/>
              	</div>
            	</div>
          	</div>
        	))}

        	<button
          	onClick={agregar}
          	className="w-full bg-surface-2 hover:bg-ink/5 border border-dashed border-line py-3 rounded-xl text-sm flex items-center justify-center gap-2"
        	>
          	<Plus size={16} /> Agregar fórmula
        	</button>

        	<div className="flex justify-between items-center pt-2">
          	<button
            	onClick={() => {
              	setEditando(false);
              	fetchFormulas();
            	}}
            	className="text-sm text-ink-muted hover:text-ink"
          	>
            	Cancelar
          	</button>
          	<button
            	onClick={guardar}
            	disabled={saving}
            	className="btn-flame px-5 py-2 rounded-lg font-semibold flex items-center gap-2"
          	>
            	{saving ? (
              	<Loader2 className="animate-spin" size={16} />
            	) : (
              	<Save size={16} />
            	)}
            	Guardar fórmulas
          	</button>
        	</div>
      	</div>
    	) : (
      	<div className="space-y-6">
        	{grupos.map(([juegos, items]) => (
          	<div
            	key={juegos}
            	className="bg-surface-2 rounded-xl border border-line overflow-hidden"
          	>
            	<div className="px-5 py-3 bg-ink/5 border-b border-line">
              	<h2 className="font-bold">{juegos || "Sin nombre"}</h2>
              	<p className="text-xs text-ink-muted">{items[0]?.tamano}</p>
            	</div>
            	<div className="divide-y divide-white/5">
              	{items.map((f) => (
                	<div key={f.id} className="p-5">
                  	<span className="inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-flame-tint text-flame-ink mb-3">
                    	{f.variante}
                  	</span>
                  	<div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    	<div>
                      	<p className="text-xs text-ink-faint uppercase">
                        	Papel
                      	</p>
                      	<p className="text-ink-soft">{f.papeles}</p>
                    	</div>
                    	<div>
                      	<p className="text-xs text-ink-faint uppercase">
                        	Calidad de impresión
                      	</p>
                      	<p className="text-ink-soft">{f.calidad}</p>
                    	</div>
                  	</div>
                  	{f.notas ? (
                    	<p className="text-xs text-amber-700 mt-3">
                      	⚠️ {f.notas}
                    	</p>
                  	) : null}
                	</div>
              	))}
            	</div>
          	</div>
        	))}

        	{savedAt ? (
          	<p className="text-xs text-green-700">Guardado a las {savedAt}</p>
        	) : null}
      	</div>
    	)}
  	</div>
	</main>
  );
}
