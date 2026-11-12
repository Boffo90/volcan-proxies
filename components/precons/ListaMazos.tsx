"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { FORMATOS, rutaMazo, type MazoResumen } from "@/lib/mazos";
import {
  espanolCompleto,
  imagenDeScryfall,
  nombreComandantes,
  type ColorMana,
} from "@/lib/precons";
import { plano, useCartasDeMazos } from "@/hooks/useCartasDeMazos";
import Pips from "./Pips";

const COLORES: ColorMana[] = ["W", "U", "B", "R", "G"];

/** El listado de mazos listos, con buscador (también por carta) y colores. */
export default function ListaMazos({ mazos }: { mazos: MazoResumen[] }) {
  const [q, setQ] = useState("");
  const [colores, setColores] = useState<ColorMana[]>([]);
  const { cargar, buscar } = useCartasDeMazos("/mazos/_cartas.json");

  const porCarta = useMemo(() => buscar(q), [buscar, q]);

  const filtrados = useMemo(() => {
    const texto = plano(q.trim());
    return mazos.filter((m) => {
      if (colores.some((c) => !m.colores.includes(c))) return false;
      if (!texto) return true;
      return (
        plano([m.nombre, nombreComandantes(m), m.arquetipo].join(" ")).includes(texto) ||
        porCarta.has(m.slug)
      );
    });
  }, [mazos, q, colores, porCarta]);

  const hayFiltro = Boolean(q.trim()) || colores.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5 pb-4 mb-8 border-b-2 border-ink">
        <label className="relative flex-1 min-w-[220px]">
          <span className="sr-only">Buscar mazos</span>
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={q}
            onChange={(e) => {
              // Tambien al escribir, no solo al enfocar: un campo puede llenarse
              // sin que nadie lo toque (dictado, autocompletar).
              cargar();
              setQ(e.target.value);
            }}
            onFocus={cargar}
            placeholder="Busca por mazo, comandante, estilo o carta"
            className="w-full bg-surface-2 border-2 border-line rounded-lg pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink"
          />
        </label>
        <div className="flex items-center gap-1" role="group" aria-label="Filtrar por color">
          {COLORES.map((c) => {
            const activo = colores.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={activo}
                onClick={() =>
                  setColores((prev) =>
                    activo ? prev.filter((x) => x !== c) : [...prev, c]
                  )
                }
                className={
                  "p-1.5 rounded-full border-2 transition " +
                  (activo
                    ? "border-ink bg-flame-tint"
                    : "border-transparent opacity-45 hover:opacity-100")
                }
              >
                <Pips colores={[c]} size={22} />
              </button>
            );
          })}
        </div>
        <span className="text-sm text-ink-muted ml-auto whitespace-nowrap">
          {filtrados.length} {filtrados.length === 1 ? "mazo" : "mazos"}
        </span>
      </div>

      {filtrados.length === 0 ? (
        <div className="block-card p-10 text-center mb-10">
          <p className="font-display font-extrabold text-xl text-ink mb-2">
            Ningún mazo calza con eso
          </p>
          <p className="text-ink-muted mb-5">
            Prueba con el nombre del comandante o saca algún filtro.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setColores([]);
            }}
            className="btn-ghost px-5 py-2.5"
          >
            Quitar filtros
          </button>
        </div>
      ) : null}

      {FORMATOS.map((f) => {
        const delFormato = filtrados.filter((m) => m.formato === f.id);
        if (!delFormato.length) return null;
        return (
          <section key={f.id} id={"formato-" + f.id} className="mb-14 scroll-mt-24">
            <h2 className="font-display font-extrabold text-3xl text-ink mb-2">
              {f.label}
            </h2>
            {/* La explicación del formato estorba cuando ya se está filtrando. */}
            {!hayFiltro ? (
              <p className="text-ink-muted max-w-2xl mb-6">{f.descripcion}</p>
            ) : (
              <div className="mb-4" />
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {delFormato.map((m) => {
                const trae = porCarta.get(m.slug);
                return (
                  <Link
                    key={m.slug}
                    href={rutaMazo(m)}
                    className="block-card glow-hover overflow-hidden flex flex-col"
                  >
                    <div
                      className="relative aspect-[16/10] bg-surface-3 bg-cover bg-center border-b-2 border-ink"
                      style={{
                        backgroundImage: `url(${imagenDeScryfall(
                          m.comandantes[0].id,
                          "art_crop"
                        )})`,
                      }}
                    >
                      <span className="badge absolute top-3 left-3 bg-surface-2 text-ink text-[11px] px-2 py-1">
                        {f.label}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col gap-1.5 flex-1">
                      <Pips colores={m.colores} size={17} />
                      <p className="font-display font-extrabold text-xl text-ink leading-tight">
                        {m.nombre}
                      </p>
                      <p className="text-sm text-ink-muted">{nombreComandantes(m)}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-flame-ink">
                        {m.arquetipo}
                      </p>
                      {trae ? (
                        <p className="text-xs text-ink-soft">
                          Trae <b className="text-ink">{trae}</b>
                        </p>
                      ) : null}
                      <p className="mt-auto pt-2 text-xs text-ink-muted">
                        {m.tierras} tierras · curva {String(m.curva).replace(".", ",")} ·{" "}
                        {espanolCompleto(m)
                          ? "español completo"
                          : `español ${m.enEs}/${m.total}`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
