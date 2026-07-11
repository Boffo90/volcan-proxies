"use client";

import {
  finishDisponible,
  formatCLP,
  type Finish,
  type Precios,
} from "@/lib/pricing";

type Props = {
  precios: Precios;
  value: Finish;
  onChange: (f: Finish) => void;
  /** "md": botones grandes con precio (detalle). "xs": toggles compactos. */
  size?: "md" | "xs";
  /** Se suma al precio mostrado (recargo de customs). Solo aplica en "md". */
  surcharge?: number;
  /** Restringe qué acabados se muestran (ej: finish_options de un custom). */
  allowed?: Finish[];
};

/**
 * Selector Glossy/Matte que respeta la disponibilidad configurada en el
 * admin: los acabados desactivados se ven bloqueados con "No disponible".
 */
export default function FinishButtons({
  precios,
  value,
  onChange,
  size = "md",
  surcharge = 0,
  allowed,
}: Props) {
  const opciones: Array<{ f: Finish; label: string; precio: number }> = (
	[
  	{ f: "glossy" as Finish, label: "Glossy", precio: precios.glossy + surcharge },
  	{ f: "matte" as Finish, label: "Matte", precio: precios.matte + surcharge },
	]
  ).filter((o) => !allowed || allowed.includes(o.f));

  return (
	<div className={size === "md" ? "flex gap-2" : "flex gap-1"}>
  	{opciones.map(({ f, label, precio }) => {
    	const disponible = finishDisponible(precios, f);
    	const sel = value === f && disponible;

    	const cls =
      	size === "md"
        	? "flex-1 py-2 rounded-lg border transition text-center " +
          	(!disponible
            	? "border-white/10 opacity-40 cursor-not-allowed"
            	: sel
            	? "border-[#FF4D1A] bg-[#FF4D1A]/10 shadow-[0_0_20px_-6px_rgba(255,79,26,0.6)]"
            	: "border-white/10")
        	: "flex-1 py-1 text-[10px] rounded transition text-center " +
          	(!disponible
            	? "bg-white/5 text-gray-500 opacity-50 cursor-not-allowed"
            	: sel
            	? "bg-[#FF4D1A]/20 text-[#FF4D1A]"
            	: "bg-white/5 text-gray-400");

    	return (
      	<button
        	key={f}
        	type="button"
        	disabled={!disponible}
        	onClick={() => disponible && onChange(f)}
        	className={cls}
      	>
        	{size === "md" && disponible ? `${label} · ${formatCLP(precio)}` : label}
        	{!disponible ? (
          	<span
            	className={
              	size === "md"
                	? "block text-[10px] text-gray-400 font-normal"
                	: "block text-[8px]"
            	}
          	>
            	No disponible por ahora
          	</span>
        	) : null}
      	</button>
    	);
  	})}
	</div>
  );
}
