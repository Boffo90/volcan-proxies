"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Upload,
  Trash2,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";

type Custom = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  image_url: string;
  finish_options: string[];
  surcharge: number | null;
  active: boolean;
  sort_order: number;
};

export default function AdminCustomsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customs, setCustoms] = useState<Custom[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
	name: "",
	description: "",
	tags: "",
	image_url: "",
	surcharge: "",
  });

  const fetchCustoms = useCallback(async () => {
	setLoading(true);
	const res = await fetch("/api/admin/customs");
	if (res.status === 401) {
  	router.push("/admin/login");
  	return;
	}
	const data = await res.json();
	setCustoms(data.customs || []);
	setLoading(false);
  }, [router]);

  useEffect(() => {
	fetchCustoms();
  }, [fetchCustoms]);

  const handleUpload = async (file: File) => {
	setError("");
	setUploading(true);
	try {
  	const fd = new FormData();
  	fd.append("file", file);
  	const res = await fetch("/api/custom/upload", { method: "POST", body: fd });
  	const data = await res.json();
  	if (!res.ok) throw new Error(data.error || "Error al subir");
  	setForm((f) => ({ ...f, image_url: data.url }));
	} catch (err: unknown) {
  	setError(err instanceof Error ? err.message : "Error al subir imagen");
	} finally {
  	setUploading(false);
	}
  };

  const handleCreate = async () => {
	if (!form.name.trim() || !form.image_url) {
  	setError("Nombre e imagen son requeridos");
  	return;
	}
	setCreating(true);
	setError("");
	const res = await fetch("/api/admin/customs", {
  	method: "POST",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({
    	name: form.name.trim(),
    	description: form.description.trim() || null,
    	tags: form.tags
      	.split(",")
      	.map((t) => t.trim())
      	.filter(Boolean),
    	image_url: form.image_url,
    	surcharge: form.surcharge ? Number(form.surcharge) : null,
  	}),
	});
	setCreating(false);
	if (!res.ok) {
  	const data = await res.json();
  	setError(data.error || "Error al crear");
  	return;
	}
	setForm({ name: "", description: "", tags: "", image_url: "", surcharge: "" });
	fetchCustoms();
  };

  const toggleActive = async (c: Custom) => {
	await fetch(`/api/admin/customs/${c.id}`, {
  	method: "PATCH",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({ active: !c.active }),
	});
	fetchCustoms();
  };

  const handleDelete = async (c: Custom) => {
	if (!confirm(`¿Eliminar "${c.name}"? Esta acción no se puede deshacer.`)) return;
	await fetch(`/api/admin/customs/${c.id}`, { method: "DELETE" });
	fetchCustoms();
  };

  const updateSortOrder = async (c: Custom, sort_order: number) => {
	await fetch(`/api/admin/customs/${c.id}`, {
  	method: "PATCH",
  	headers: { "Content-Type": "application/json" },
  	body: JSON.stringify({ sort_order }),
	});
	fetchCustoms();
  };

  if (loading) {
	return (
  	<main className="min-h-screen bg-[#0F1115] text-white flex justify-center py-32">
    	<Loader2 className="animate-spin text-[#FF4D1A]" size={32} />
  	</main>
	);
  }

  return (
	<main className="min-h-screen bg-[#0F1115] text-white">
  	<div className="max-w-4xl mx-auto px-6 py-8">
    	<button
      	onClick={() => router.push("/admin")}
      	className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6"
    	>
      	<ArrowLeft size={16} /> Volver al panel
    	</button>

    	<h1 className="text-3xl font-bold mb-2">
      	Catálogo de <span className="text-[#FF4D1A]">customs</span>
    	</h1>
    	<p className="text-gray-400 mb-6 text-sm">
      	Diseños subidos aquí aparecen en la galería pública en{" "}
      	<code>/customs</code>.
    	</p>

    	<div className="bg-[#1E242B] p-6 rounded-xl border border-white/10 mb-8">
      	<h2 className="font-bold mb-4">Agregar nuevo diseño</h2>

      	<div className="grid md:grid-cols-[160px_1fr] gap-4">
        	<div>
          	<div
            	className="aspect-[5/7] rounded-lg border-2 border-dashed border-white/20 hover:border-[#FF4D1A]/50 transition bg-[#0F1115] bg-center bg-cover bg-no-repeat flex items-center justify-center cursor-pointer"
            	style={
              	form.image_url
                	? { backgroundImage: `url(${form.image_url})` }
                	: undefined
            	}
            	onClick={() => fileInputRef.current?.click()}
          	>
            	{!form.image_url ? (
              	uploading ? (
                	<Loader2 className="animate-spin text-[#FF4D1A]" size={24} />
              	) : (
                	<Upload className="text-gray-500" size={24} />
              	)
            	) : null}
          	</div>
          	<input
            	ref={fileInputRef}
            	type="file"
            	accept="image/jpeg,image/png,image/jpg"
            	className="hidden"
            	onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          	/>
        	</div>

        	<div className="space-y-3">
          	<input
            	value={form.name}
            	onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            	placeholder="Nombre del diseño"
            	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm"
          	/>
          	<textarea
            	value={form.description}
            	onChange={(e) =>
              	setForm((f) => ({ ...f, description: e.target.value }))
            	}
            	placeholder="Descripción (opcional)"
            	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm min-h-[70px]"
          	/>
          	<input
            	value={form.tags}
            	onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            	placeholder="Tags separados por coma (ej: fantasía, oscuro)"
            	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm"
          	/>
          	<input
            	type="number"
            	value={form.surcharge}
            	onChange={(e) =>
              	setForm((f) => ({ ...f, surcharge: e.target.value }))
            	}
            	placeholder="Recargo específico en CLP (opcional, usa el global si se deja vacío)"
            	className="w-full bg-[#0F1115] border border-white/10 rounded-lg px-3 py-2 text-sm"
          	/>
        	</div>
      	</div>

      	{error ? <p className="text-sm text-red-400 mt-3">{error}</p> : null}

      	<button
        	onClick={handleCreate}
        	disabled={creating || uploading}
        	className="mt-4 bg-[#FF4D1A] hover:bg-[#e64418] px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition disabled:opacity-50"
      	>
        	{creating ? (
          	<Loader2 className="animate-spin" size={16} />
        	) : (
          	<Plus size={16} />
        	)}
        	Agregar al catálogo
      	</button>
    	</div>

    	<h2 className="font-bold mb-4">
      	Diseños existentes ({customs.length})
    	</h2>
    	<div className="space-y-3">
      	{customs.map((c) => (
        	<div
          	key={c.id}
          	className="bg-[#1E242B] p-4 rounded-xl border border-white/10 flex items-center gap-4"
        	>
          	<div
            	className="w-14 h-20 rounded bg-[#0F1115] bg-center bg-cover bg-no-repeat flex-shrink-0"
            	style={{ backgroundImage: `url(${c.image_url})` }}
          	/>
          	<div className="flex-1 min-w-0">
            	<p className="font-semibold truncate">{c.name}</p>
            	<p className="text-xs text-gray-400 truncate">
              	{c.tags.join(", ") || "sin tags"}
              	{c.surcharge != null ? ` · recargo ${c.surcharge}` : ""}
            	</p>
          	</div>
          	<label className="text-xs text-gray-400 flex items-center gap-1">
            	Orden
            	<input
              	type="number"
              	defaultValue={c.sort_order}
              	onBlur={(e) => updateSortOrder(c, Number(e.target.value) || 0)}
              	className="w-14 bg-[#0F1115] border border-white/10 rounded px-1.5 py-1 text-xs"
            	/>
          	</label>
          	<button
            	onClick={() => toggleActive(c)}
            	title={c.active ? "Ocultar del catálogo" : "Mostrar en catálogo"}
            	className={
              	"p-2 rounded-lg transition " +
              	(c.active
                	? "text-green-400 hover:bg-green-500/10"
                	: "text-gray-500 hover:bg-white/5")
            	}
          	>
            	{c.active ? <Eye size={16} /> : <EyeOff size={16} />}
          	</button>
          	<button
            	onClick={() => handleDelete(c)}
            	title="Eliminar"
            	className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition"
          	>
            	<Trash2 size={16} />
          	</button>
        	</div>
      	))}
      	{customs.length === 0 ? (
        	<p className="text-gray-500 text-sm">Aún no hay diseños custom.</p>
      	) : null}
    	</div>
  	</div>
	</main>
  );
}
