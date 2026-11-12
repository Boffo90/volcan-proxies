import Link from "next/link";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ListaPrecons from "@/components/precons/ListaPrecons";
import { PRECONS } from "@/lib/precons";

export const metadata = {
  title: `Precons de Commander: los ${PRECONS.length} mazos, en proxies`,
  description:
    `Los ${PRECONS.length} mazos preconstruidos de Commander de Magic, de 2011 a hoy, ` +
    "con su lista completa. Elige uno y te lo imprimimos entero: quita las " +
    "cartas que ya tienes y cambia el arte de las que quieras.",
  alternates: { canonical: "/precons" },
};

export default function PreconsPage() {
  const anios = PRECONS.map((p) => p.fecha.slice(0, 4));
  const desde = anios[anios.length - 1];

  return (
    <main className="min-h-screen bg-surface text-ink-soft">
      <NavBar />

      <section className="px-6 pt-12 pb-20 max-w-6xl mx-auto">
        <header className="mb-8 max-w-3xl">
          <span className="badge bg-mana-w px-3 py-1.5 text-xs text-ink mb-5 -rotate-1">
            Mazos listos para jugar
          </span>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-ink mb-4 text-balance">
            Precons de <span className="text-lava">Commander</span>
          </h1>
          <p className="text-lg text-ink-muted">
            Los {PRECONS.length} mazos preconstruidos de Commander, de {desde} a
            hoy. Elige uno y te lo imprimimos completo: antes de pagar puedes
            quitar las cartas que ya tienes, cambiar el arte de las que quieras
            y sumar los tokens que usa.
          </p>
          <p className="text-sm text-ink-faint mt-3">
            ¿Ya tienes tu propia lista?{" "}
            <Link
              href="/importar"
              className="font-bold text-flame-ink underline underline-offset-2"
            >
              Impórtala acá
            </Link>
            . ¿Buscas algo más fuerte que un precon?{" "}
            <Link
              href="/mazos"
              className="font-bold text-flame-ink underline underline-offset-2"
            >
              Mira los mazos listos
            </Link>
            .
          </p>
        </header>

        <ListaPrecons mazos={PRECONS} />

        <p className="text-xs text-ink-faint mt-12 max-w-3xl">
          Listas oficiales de cada producto, publicadas por Wizards of the
          Coast. Lo que imprimimos son proxies para jugar, no cartas
          oficiales.
        </p>
      </section>

      <Footer />
    </main>
  );
}
