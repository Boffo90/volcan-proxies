"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import {
  GRUPOS,
  imagenDeScryfall,
  type PreconCarta,
  type PreconToken,
} from "@/lib/precons";

const fichaDe = (id: string) => "/carta/" + encodeURIComponent("mtg:" + id);

/**
 * La lista completa de un mazo, de dos formas: como texto por tipo de carta
 * —que es como se lee una lista de Commander— o como las cartas mismas.
 *
 * En la vista de texto, pasar el cursor por un nombre muestra la carta en una
 * esquina. Va en una esquina fija y no pegada al cursor porque una carta que
 * sigue al mouse tapa justo la lista que uno está leyendo.
 */
export default function ListaMazo({
  cartas,
  tokens,
}: {
  cartas: PreconCarta[];
  tokens: PreconToken[];
}) {
  const [vista, setVista] = useState<"lista" | "imagenes">("lista");
  const [mirando, setMirando] = useState<string | null>(null);

  const total = cartas.reduce((s, c) => s + c.q, 0);
  const grupos = GRUPOS.map((g) => ({
    ...g,
    cartas: cartas.filter((c) => c.t === g.id),
  })).filter((g) => g.cartas.length > 0);

  const boton = (activo: boolean) =>
    "px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-1.5 transition-colors " +
    (activo ? "bg-ink text-ink-invert" : "text-ink-muted hover:text-ink");

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5 border-b-2 border-ink pb-3">
        <h2 className="font-display font-extrabold text-3xl text-ink">
          Lista completa{" "}
          <span className="text-ink-faint text-xl">{total} cartas</span>
        </h2>
        <div className="flex gap-1 bg-surface-3 p-1 rounded-lg" role="group" aria-label="Cómo ver la lista">
          <button
            type="button"
            aria-pressed={vista === "lista"}
            onClick={() => setVista("lista")}
            className={boton(vista === "lista")}
          >
            <List size={15} /> Lista
          </button>
          <button
            type="button"
            aria-pressed={vista === "imagenes"}
            onClick={() => setVista("imagenes")}
            className={boton(vista === "imagenes")}
          >
            <LayoutGrid size={15} /> Cartas
          </button>
        </div>
      </div>

      {vista === "lista" ? (
        <div
          className="columns-1 sm:columns-2 lg:columns-3 gap-8"
          onMouseLeave={() => setMirando(null)}
        >
          {grupos.map((g) => (
            <div key={g.id} className="break-inside-avoid mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-flame-ink mb-1.5">
                {g.label}{" "}
                <span className="text-ink-faint">
                  {g.cartas.reduce((s, c) => s + c.q, 0)}
                </span>
              </h3>
              <ul>
                {g.cartas.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={fichaDe(c.id)}
                      onMouseEnter={() => setMirando(c.id)}
                      onFocus={() => setMirando(c.id)}
                      className="flex items-baseline gap-1.5 py-0.5 text-sm text-ink-soft hover:text-flame-ink"
                    >
                      {c.q > 1 ? (
                        <span className="font-bold text-ink">{c.q}×</span>
                      ) : null}
                      <span>{c.n}</span>
                      {!c.es ? (
                        <span
                          className="text-[9px] font-bold uppercase text-ink-faint"
                          title="Esta impresión no existe en español"
                        >
                          EN
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {grupos.map((g) => (
            <div key={g.id} className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-flame-ink mb-2.5">
                {g.label}{" "}
                <span className="text-ink-faint">
                  {g.cartas.reduce((s, c) => s + c.q, 0)}
                </span>
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                {g.cartas.map((c) => (
                  <Link
                    key={c.id}
                    href={fichaDe(c.id)}
                    title={c.n}
                    className="relative block aspect-[5/7] rounded-md overflow-hidden bg-surface-3 border border-line hover:border-ink transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagenDeScryfall(c.id, "small")}
                      alt={c.n}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {c.q > 1 ? (
                      <span className="absolute bottom-1 right-1 bg-ink text-ink-invert text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {c.q}×
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tokens.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-display font-extrabold text-2xl text-ink mb-1">
            Tokens que usa este mazo{" "}
            <span className="text-ink-faint text-lg">{tokens.length}</span>
          </h2>
          <p className="text-sm text-ink-muted mb-4">
            Los que crean las cartas del mazo. Se suman al pedido si dejas
            marcado &quot;Agregar los tokens&quot;.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {tokens.map((t) => (
              <figure key={t.id}>
                <div className="aspect-[5/7] rounded-md overflow-hidden bg-surface-3 border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagenDeScryfall(t.id, "small")}
                    alt={"Token " + t.n}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <figcaption className="text-[11px] text-ink-muted mt-1 truncate">
                  {t.n}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {/* La carta bajo el cursor. Solo donde hay cursor de verdad. */}
      {mirando && vista === "lista" ? (
        <div
          aria-hidden
          className="hidden lg:block fixed bottom-6 right-6 z-30 w-[250px] aspect-[5/7] rounded-xl overflow-hidden border-2 border-ink bg-surface-3 shadow-[var(--lift-lg)] pointer-events-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenDeScryfall(mirando, "normal")}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
    </section>
  );
}
