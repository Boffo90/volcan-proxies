import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Pips from "@/components/precons/Pips";
import { FORMATOS, MAZOS, rutaMazo } from "@/lib/mazos";
import {
  espanolCompleto,
  imagenDeScryfall,
  nombreComandantes,
} from "@/lib/precons";

export const metadata = {
  title: "Mazos listos de Commander: cEDH y Bracket 3, en proxies",
  description:
    "Mazos completos de Commander, cEDH y Bracket 3, con su plan de juego y " +
    "cómo ganan explicado. Elige uno y te lo imprimimos entero: quita las " +
    "cartas que ya tienes y cambia el arte de las que quieras.",
  alternates: { canonical: "/mazos" },
};

export default function MazosPage() {
  return (
    <main className="min-h-screen bg-surface text-ink-soft">
      <NavBar />

      <section className="px-6 pt-12 pb-20 max-w-6xl mx-auto">
        <header className="mb-10 max-w-3xl">
          <span className="badge bg-mana-w px-3 py-1.5 text-xs text-ink mb-5 -rotate-1">
            Elige, revisa y juega
          </span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-ink mb-4 text-balance">
            Mazos <span className="text-lava">listos</span>
          </h1>
          <p className="text-lg text-ink-muted">
            Los mazos que más se juegan y más ganan, con su plan de juego y
            cómo cierran la partida explicado sin jerga. Elige uno y te lo imprimimos entero: antes de
            pagar puedes quitar las cartas que ya tienes y cambiar el arte de
            las que quieras.
          </p>
          <p className="text-sm text-ink-faint mt-3">
            ¿Buscas un producto oficial?{" "}
            <Link
              href="/precons"
              className="font-bold text-flame-ink underline underline-offset-2"
            >
              Mira los precons de Commander
            </Link>
            .
          </p>
        </header>

        {FORMATOS.map((f) => {
          const mazos = MAZOS.filter((m) => m.formato === f.id);
          if (!mazos.length) return null;
          return (
            <section key={f.id} id={"formato-" + f.id} className="mb-14 scroll-mt-24">
              <h2 className="font-display font-extrabold text-3xl text-ink mb-2">
                {f.label}
              </h2>
              <p className="text-ink-muted max-w-2xl mb-6">{f.descripcion}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {mazos.map((m) => (
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
                      <p className="text-sm text-ink-muted">
                        {nombreComandantes(m)}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-wide text-flame-ink">
                        {m.arquetipo}
                      </p>
                      <p className="mt-auto pt-2 text-xs text-ink-muted">
                        {m.tierras} tierras · curva {String(m.curva).replace(".", ",")} ·{" "}
                        {espanolCompleto(m)
                          ? "español completo"
                          : `español ${m.enEs}/${m.total}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-xs text-ink-faint max-w-3xl">
          Las listas cEDH salen de resultados de torneo publicados en
          edhtop16.com y las de Bracket 3 del mazo promedio de EDHREC; cada
          mazo enlaza a su lista original. No son productos oficiales, y lo que
          imprimimos son proxies para jugar, no cartas oficiales.
        </p>
      </section>

      <Footer />
    </main>
  );
}
