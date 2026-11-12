import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ListaMazos from "@/components/precons/ListaMazos";
import { MAZOS } from "@/lib/mazos";

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

        <ListaMazos mazos={MAZOS} />

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
