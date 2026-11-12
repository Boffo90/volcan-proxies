"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import {
  anioDe,
  espanolCompleto,
  fechaCorta,
  imagenDeScryfall,
  nombreComandantes,
  rutaPrecon,
  type ColorMana,
  type PreconResumen,
} from "@/lib/precons";
import { plano, useCartasDeMazos } from "@/hooks/useCartasDeMazos";
import Pips from "./Pips";

const COLORES: ColorMana[] = ["W", "U", "B", "R", "G"];


export default function ListaPrecons({ mazos }: { mazos: PreconResumen[] }) {
  const [q, setQ] = useState("");
  const [colores, setColores] = useState<ColorMana[]>([]);
  const [soloEs, setSoloEs] = useState(false);
  const [sinUb, setSinUb] = useState(false);

  // Qué mazos traen una carta que calce con lo escrito, y cuál.
  const { cargar, buscar } = useCartasDeMazos("/precons/_cartas.json");
  const porCarta = useMemo(() => buscar(q), [buscar, q]);

  const filtrados = useMemo(() => {
    const texto = plano(q.trim());
    return mazos.filter((m) => {
      if (soloEs && !espanolCompleto(m)) return false;
      if (sinUb && m.ub) return false;
      // El mazo tiene que llevar todos los colores marcados, no alguno:
      // quien marca azul y negro busca un mazo que juegue los dos.
      if (colores.some((c) => !m.colores.includes(c))) return false;
      if (!texto) return true;
      return (
        plano(
          [m.nombre, m.setNombre, m.set, nombreComandantes(m), anioDe(m)].join(" ")
        ).includes(texto) || porCarta.has(m.set + "/" + m.slug)
      );
    });
  }, [mazos, q, colores, soloEs, sinUb, porCarta]);

  // Año -> producto -> mazos, respetando el orden en que vienen (el más
  // nuevo primero).
  const porAnio = useMemo(() => {
    const anios: {
      anio: string;
      sets: { clave: string; nombre: string; set: string; fecha: string; mazos: PreconResumen[] }[];
    }[] = [];
    for (const m of filtrados) {
      const anio = anioDe(m);
      let a = anios.find((x) => x.anio === anio);
      if (!a) anios.push((a = { anio, sets: [] }));
      const clave = m.set + m.fecha;
      let s = a.sets.find((x) => x.clave === clave);
      if (!s) {
        a.sets.push(
          (s = { clave, nombre: m.setNombre, set: m.set, fecha: m.fecha, mazos: [] })
        );
      }
      s.mazos.push(m);
    }
    return anios;
  }, [filtrados]);

  const hayFiltro = Boolean(q.trim()) || colores.length > 0 || soloEs || sinUb;
  const limpiar = () => {
    setQ("");
    setColores([]);
    setSoloEs(false);
    setSinUb(false);
  };

  const chip = (activo: boolean) =>
    "px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-colors " +
    (activo
      ? "bg-ink border-ink text-ink-invert"
      : "bg-surface-2 border-line text-ink-muted hover:border-ink");

  return (
    <div>
      {/* Filtros. Pegados arriba al bajar: con 186 mazos se filtra más de
          una vez, y volver al inicio cada vez es lo que hace abandonar. Solo
          desde tablet: en un teléfono los filtros ocupan un tercio de la
          pantalla y pegados no dejarían ver los mazos. */}
      <div className="md:sticky md:top-[68px] z-20 -mx-6 px-6 py-3 bg-surface border-b-2 border-ink mb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative flex-1 min-w-[220px]">
            <span className="sr-only">Buscar precons</span>
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
              placeholder="Busca por mazo, comandante, edición o carta"
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

          <button
            type="button"
            aria-pressed={soloEs}
            onClick={() => setSoloEs((v) => !v)}
            className={chip(soloEs)}
          >
            Español completo
          </button>
          <button
            type="button"
            aria-pressed={sinUb}
            onClick={() => setSinUb((v) => !v)}
            className={chip(sinUb)}
          >
            Sin Universes Beyond
          </button>

          <span className="text-sm text-ink-muted ml-auto whitespace-nowrap">
            {filtrados.length} {filtrados.length === 1 ? "mazo" : "mazos"}
          </span>
        </div>

        {porAnio.length > 1 ? (
          <nav
            aria-label="Ir a un año"
            className="flex gap-1.5 mt-3 overflow-x-auto pb-0.5"
          >
            {porAnio.map((a) => (
              <a
                key={a.anio}
                href={"#anio-" + a.anio}
                className="px-2.5 py-1 rounded-md bg-surface-3 text-xs font-bold text-ink-soft hover:bg-ink hover:text-ink-invert transition-colors"
              >
                {a.anio}
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      {filtrados.length === 0 ? (
        <div className="block-card p-10 text-center">
          <p className="font-display font-extrabold text-xl text-ink mb-2">
            Ningún mazo calza con eso
          </p>
          <p className="text-ink-muted mb-5">
            Prueba con el nombre del comandante o saca algún filtro.
          </p>
          <button type="button" onClick={limpiar} className="btn-ghost px-5 py-2.5">
            Quitar filtros
          </button>
        </div>
      ) : null}

      {porAnio.map((a) => (
        <section key={a.anio} id={"anio-" + a.anio} className="mb-12 scroll-mt-44">
          <h2 className="font-display font-extrabold text-4xl text-ink mb-5">
            {a.anio}
          </h2>
          {a.sets.map((s) => (
            <div key={s.clave} className="mb-8">
              <h3 className="flex flex-wrap items-baseline gap-x-3 mb-3">
                <span className="font-display font-extrabold text-lg text-ink">
                  {s.nombre}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                  {s.set} · {fechaCorta(s.fecha)}
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {s.mazos.map((m) => (
                  <Link
                    key={m.set + m.slug}
                    href={rutaPrecon(m)}
                    className="block-card glow-hover overflow-hidden flex flex-col"
                  >
                    <div
                      className="aspect-[4/3] bg-surface-3 bg-cover bg-center border-b-2 border-ink"
                      style={{
                        backgroundImage: `url(${imagenDeScryfall(
                          m.comandantes[0].id,
                          "art_crop"
                        )})`,
                      }}
                    />
                    <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                      <Pips colores={m.colores} size={16} />
                      <p className="font-display font-extrabold text-ink leading-tight">
                        {m.nombre}
                      </p>
                      <p className="text-xs text-ink-muted leading-snug">
                        {nombreComandantes(m)}
                      </p>
                      {porCarta.get(m.set + "/" + m.slug) ? (
                        <p className="text-xs text-ink-soft leading-snug">
                          Trae{" "}
                          <b className="text-ink">
                            {porCarta.get(m.set + "/" + m.slug)}
                          </b>
                        </p>
                      ) : null}
                      <p className="mt-auto pt-1.5 flex flex-wrap gap-1.5">
                        <span
                          className={
                            "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded " +
                            (espanolCompleto(m)
                              ? "bg-mana-g/15 text-green-800"
                              : "bg-ink/5 text-ink-muted")
                          }
                        >
                          {espanolCompleto(m)
                            ? "Español completo"
                            : `Español ${m.enEs}/${m.total}`}
                        </span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}

      {hayFiltro && filtrados.length > 0 ? (
        <p className="text-center">
          <button
            type="button"
            onClick={limpiar}
            className="inline-flex items-center gap-1.5 font-bold text-flame-ink underline underline-offset-4 decoration-2"
          >
            <X size={15} /> Quitar filtros y ver los {mazos.length}
          </button>
        </p>
      ) : null}
    </div>
  );
}
