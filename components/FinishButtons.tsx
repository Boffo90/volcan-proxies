"use client";

import Link from "next/link";
import {
  FINISHES,
  FINISH_INFO,
  finishDisponible,
  formatCLP,
  precioUnitario,
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
  /** Muestra el pro/contra del acabado elegido debajo. Solo en "md". */
  showInfo?: boolean;
};

/**
* Selector de acabado que respeta la disponibilidad configurada en el admin:
* los desactivados se ven bloqueados con "No disponible". Con cuatro opciones
* van en dos columnas, porque en una fila no alcanzan a leerse en móvil.
*/
export default function FinishButtons({
  precios,
  value,
  onChange,
  size = "md",
  surcharge = 0,
  allowed,
  showInfo = false,
}: Props) {
  const opciones = FINISHES.filter((f) => !allowed || allowed.includes(f));
  const info = FINISH_INFO[value];
  const valueDisponible = finishDisponible(precios, value);

  return (
	<div>
  	<div className="grid grid-cols-2 gap-2">
    	{opciones.map((f) => {
      	const disponible = finishDisponible(precios, f);
      	const sel = value === f && disponible;
      	const precio = precioUnitario(precios, f) + surcharge;
      	const label = FINISH_INFO[f].corto;

      	const cls =
        	size === "md"
          	? "py-2 px-2 rounded-lg border transition text-center " +
            	(!disponible
              	? "border-white/10 opacity-40 cursor-not-allowed"
              	: sel
              	? "border-[#FF4D1A] bg-[#FF4D1A]/10 shadow-[0_0_20px_-6px_rgba(255,79,26,0.6)]"
              	: "border-white/10 hover:border-white/25")
          	: "py-1 px-1 text-[10px] rounded transition text-center " +
            	(!disponible
              	? "bg-white/5 text-gray-500 opacity-50 cursor-not-allowed"
              	: sel
              	? "bg-[#FF4D1A]/20 text-[#FF4D1A]"
              	: "bg-white/5 text-gray-400 hover:text-white");

      	return (
        	<button
          	key={f}
          	type="button"
          	disabled={!disponible}
          	onClick={() => disponible && onChange(f)}
          	title={FINISH_INFO[f].desc}
          	className={cls}
        	>
          	<span className={size === "md" ? "font-semibold" : ""}>{label}</span>
          	{size === "md" && disponible ? (
            	<span className="block text-xs text-gray-300">
              	{formatCLP(precio)}
            	</span>
          	) : null}
          	{!disponible ? (
            	<span
              	className={
                	size === "md"
                  	? "block text-[10px] text-gray-400 font-normal"
                  	: "block text-[8px]"
              	}
            	>
              	No disponible
            	</span>
          	) : null}
        	</button>
      	);
    	})}
  	</div>

  	{showInfo && size === "md" && valueDisponible ? (
    	<div className="mt-3 text-xs text-gray-400 space-y-1">
      	<p>{info.desc}</p>
      	<p className="text-green-400">✓ {info.pro}</p>
      	<p className="text-yellow-400">⚠ {info.contra}</p>
    	</div>
  	) : null}

  	{size === "md" ? (
    	<Link
      	href="/acabados"
      	className="inline-block mt-2 text-xs text-[#FF4D1A] hover:underline"
    	>
      	¿Cuál elijo? Ver los acabados en detalle →
    	</Link>
  	) : null}
	</div>
  );
}
