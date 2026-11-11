"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { usePrecios } from "@/hooks/usePrecios";
import {
  FINISH_INFO,
  calculateTotalWith,
  defaultFinish,
  finishDisponible,
  finishesDisponibles,
  formatCLP,
  type Finish,
} from "@/lib/pricing";

type Props = {
  set: string;
  slug: string;
  total: number;
  enEs: number;
  tokens: number;
};

/**
 * El panel de compra de un precon: acabado, idioma, tokens y el botón.
 *
 * No agrega nada al carrito por su cuenta. Manda al importador con el mazo ya
 * cargado, que es donde el cliente quita las cartas que tiene y cambia artes:
 * así un precon y una lista pegada pasan por la misma revisión, y no hay dos
 * pantallas que mantener iguales.
 */
export default function PedirPrecon({ set, slug, total, enEs, tokens }: Props) {
  const router = useRouter();
  const { precios } = usePrecios();
  const [elegido, setFinish] = useState<Finish | null>(null);
  const [idioma, setIdioma] = useState<"en" | "es">("en");
  const [conTokens, setConTokens] = useState(tokens > 0);

  // Los precios llegan después del primer render, así que el acabado se
  // deriva en vez de guardarse: si el elegido resulta estar apagado (o todavía
  // no se eligió ninguno), vale el primero disponible.
  const finish: Finish =
    elegido && finishDisponible(precios, elegido) ? elegido : defaultFinish(precios);

  // El precio de verdad, promos incluidas: lo que va a decir el carrito.
  const totalDe = (f: Finish) =>
    calculateTotalWith(precios, [{ finish: f, quantity: total }]).total;

  const faltanEs = total - enEs;

  const pedir = () => {
    const p = new URLSearchParams({
      precon: `${set}/${slug}`,
      acabado: finish,
      idioma,
    });
    if (conTokens && tokens > 0) p.set("tokens", "1");
    router.push("/importar?" + p.toString());
  };

  const opcion = (activo: boolean) =>
    "text-left rounded-xl border-2 px-4 py-3 transition " +
    (activo
      ? "border-ink bg-flame-tint shadow-[var(--lift-sm)]"
      : "border-line bg-surface-2 hover:border-ink");

  return (
    <div className="block-card p-5 md:p-6">
      <fieldset className="mb-5">
        <legend className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-2">
          Acabado
        </legend>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {finishesDisponibles(precios).map((f) => {
            const precio = totalDe(f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={finish === f}
                onClick={() => setFinish(f)}
                className={opcion(finish === f)}
              >
                <span className="block font-bold text-ink">
                  {FINISH_INFO[f].label}
                </span>
                <span className="block font-display font-extrabold text-2xl text-lava">
                  {formatCLP(precio)}
                </span>
                <span className="block text-xs text-ink-muted">
                  ~{formatCLP(Math.round(precio / total))} por carta
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-muted mt-2">{FINISH_INFO[finish].pro}</p>
      </fieldset>

      <fieldset className="mb-5">
        <legend className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-2">
          Idioma
        </legend>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            aria-pressed={idioma === "en"}
            onClick={() => setIdioma("en")}
            className={opcion(idioma === "en")}
          >
            <span className="block font-bold text-ink">Inglés</span>
            <span className="block text-xs text-ink-muted">
              Las {total} cartas
            </span>
          </button>
          <button
            type="button"
            aria-pressed={idioma === "es"}
            disabled={enEs === 0}
            onClick={() => setIdioma("es")}
            className={opcion(idioma === "es") + " disabled:opacity-50"}
          >
            <span className="block font-bold text-ink">Español</span>
            <span className="block text-xs text-ink-muted">
              {enEs === 0
                ? "Este mazo no salió en español"
                : faltanEs === 0
                ? `Las ${total} cartas`
                : `${enEs} cartas; ${faltanEs} van en inglés`}
            </span>
          </button>
        </div>
      </fieldset>

      {tokens > 0 ? (
        <label className="flex items-start gap-2.5 text-sm text-ink-soft mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={conTokens}
            onChange={(e) => setConTokens(e.target.checked)}
            className="accent-flame mt-0.5 w-4 h-4"
          />
          <span>
            Agregar {tokens === 1 ? "el token" : `los ${tokens} tokens`} que usa
            este mazo. Los revisas junto con el resto y puedes quitar los que
            no quieras.
          </span>
        </label>
      ) : null}

      <button
        type="button"
        onClick={pedir}
        className="btn-flame w-full px-6 py-4 flex items-center justify-center gap-2 text-lg"
      >
        Pedir este mazo <ArrowRight size={20} />
      </button>
      <p className="text-xs text-ink-muted mt-3">
        Te llevamos a revisar el mazo carta por carta: quita las que ya tienes
        y cambia el arte de las que quieras. No pagas nada hasta confirmar.
      </p>
    </div>
  );
}
