import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Pips from "@/components/precons/Pips";
import PedirPrecon from "@/components/precons/PedirPrecon";
import ListaMazo from "@/components/precons/ListaMazo";
import {
  PRECONS,
  espanolCompleto,
  fechaCorta,
  imagenDeScryfall,
  nombreComandantes,
  rutaPrecon,
} from "@/lib/precons";
import { leerPrecon } from "@/lib/precons-server";

type Params = { set: string; slug: string };

// Los mazos son los del índice y ninguno más: todas las páginas salen del
// build, y una dirección que no esté ahí es un 404 sin tocar el disco.
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return PRECONS.map((p) => ({ set: p.set, slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { set, slug } = await params;
  const p = PRECONS.find((x) => x.set === set && x.slug === slug);
  if (!p) return {};
  const comandantes = nombreComandantes(p);
  return {
    title: `${p.nombre} (${p.setNombre}): lista completa y proxies`,
    description:
      `La lista completa de ${p.nombre}, el precon de Commander de ${comandantes} ` +
      `(${p.setNombre}, ${p.fecha.slice(0, 4)}). ${p.total} cartas` +
      (p.tokens ? ` y ${p.tokens} tokens` : "") +
      ". Te lo imprimimos en proxies y lo despachamos a todo Chile.",
    alternates: { canonical: rutaPrecon(p) },
    openGraph: {
      title: `${p.nombre} · precon de Commander en proxies`,
      images: [imagenDeScryfall(p.comandantes[0].id, "art_crop")],
    },
  };
}

export default async function PreconPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { set, slug } = await params;
  const mazo = await leerPrecon(set, slug);
  if (!mazo) notFound();

  const total = mazo.total;
  const tierras = mazo.cartas
    .filter((c) => c.t === "tierra")
    .reduce((s, c) => s + c.q, 0);
  const completo = espanolCompleto(mazo);
  const hermanos = PRECONS.filter(
    (p) => p.set === mazo.set && p.fecha === mazo.fecha && p.slug !== mazo.slug
  );

  const datos = [
    `${total} cartas`,
    `${tierras} tierras`,
    mazo.tokens.length
      ? `${mazo.tokens.length} ${mazo.tokens.length === 1 ? "token" : "tokens"}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <main className="min-h-screen bg-surface text-ink-soft">
      <NavBar />

      <article className="px-6 pt-8 pb-20 max-w-6xl mx-auto">
        <nav
          aria-label="Ruta"
          className="flex flex-wrap items-center gap-1 text-sm text-ink-muted mb-6"
        >
          <Link href="/precons" className="font-bold text-flame-ink hover:underline">
            Precons
          </Link>
          <ChevronRight size={14} />
          <Link
            href={"/precons#anio-" + mazo.fecha.slice(0, 4)}
            className="font-bold text-flame-ink hover:underline"
          >
            {mazo.fecha.slice(0, 4)}
          </Link>
          <ChevronRight size={14} />
          <span>{mazo.setNombre}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,340px)_1fr] gap-8 lg:gap-12 items-start">
          {/* El o los comandantes. Con dos, la segunda asoma por detrás. En
              teléfono va chica: a todo el ancho empujaba el precio y el
              botón dos pantallas más abajo. */}
          <div className="relative mx-auto w-full max-w-[190px] sm:max-w-[300px] lg:max-w-none lg:sticky lg:top-24">
            {mazo.comandantes.slice(0, 2).map((c, i, todos) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={c.id}
                src={imagenDeScryfall(c.id, "large")}
                alt={c.n}
                width={672}
                height={936}
                className={
                  "rounded-[4.5%] border-2 border-ink bg-surface-3 shadow-[var(--lift-lg)] " +
                  (todos.length > 1
                    ? i === 0
                      ? "relative z-10 w-[82%] -rotate-3"
                      : "absolute top-[12%] right-0 w-[82%] rotate-6"
                    : "w-full -rotate-1")
                }
              />
            ))}
            {mazo.comandantes.length > 1 ? <div className="h-[18%]" /> : null}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-flame-ink mb-2">
              {mazo.setNombre} · {mazo.set.toUpperCase()} · {fechaCorta(mazo.fecha)}
            </p>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl text-ink mb-3 text-balance">
              {mazo.nombre}
            </h1>
            <p className="text-lg text-ink-soft mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-ink-muted">
                {mazo.comandantes.length > 1 ? "Comandantes:" : "Comandante:"}
              </span>
              <b className="text-ink">{nombreComandantes(mazo)}</b>
              <Pips colores={mazo.colores} size={20} />
            </p>

            <ul className="flex flex-wrap gap-2 mb-4">
              {datos.map((d) => (
                <li
                  key={d}
                  className="px-3 py-1.5 rounded-lg bg-surface-3 text-sm font-bold text-ink-soft"
                >
                  {d}
                </li>
              ))}
            </ul>

            <p
              className={
                "text-sm rounded-lg px-3.5 py-2.5 mb-6 border-2 " +
                (completo
                  ? "border-green-700/35 bg-mana-g/10 text-green-900"
                  : "border-line bg-surface-2 text-ink-soft")
              }
            >
              <b>{completo ? "Español completo." : "Español parcial."}</b>{" "}
              {completo
                ? `Las ${total} cartas existen en español.`
                : mazo.enEs === 0
                ? "Este producto no salió en español: va en inglés."
                : `${mazo.enEs} de ${total} cartas existen en español; las otras ${
                    total - mazo.enEs
                  } van en inglés porque nunca salieron en español.`}
            </p>

            <PedirPrecon
              clave="precon"
              valor={`${mazo.set}/${mazo.slug}`}
              total={total}
              enEs={mazo.enEs}
              tokens={mazo.tokens.length}
            />
          </div>
        </div>

        <ListaMazo cartas={mazo.cartas} tokens={mazo.tokens} />

        {hermanos.length > 0 ? (
          <section className="mt-14">
            <h2 className="font-display font-extrabold text-2xl text-ink mb-4">
              Los otros mazos de {mazo.setNombre}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {hermanos.map((h) => (
                <Link
                  key={h.slug}
                  href={rutaPrecon(h)}
                  className="block-card glow-hover overflow-hidden"
                >
                  <div
                    className="aspect-[4/3] bg-surface-3 bg-cover bg-center border-b-2 border-ink"
                    style={{
                      backgroundImage: `url(${imagenDeScryfall(
                        h.comandantes[0].id,
                        "art_crop"
                      )})`,
                    }}
                  />
                  <div className="p-3">
                    <p className="font-display font-extrabold text-ink leading-tight">
                      {h.nombre}
                    </p>
                    <p className="text-xs text-ink-muted">{nombreComandantes(h)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs text-ink-faint mt-12">
          <Link href="/precons" className="font-bold text-flame-ink hover:underline">
            ← Todos los precons
          </Link>{" "}
          · Lista oficial del producto, publicada por Wizards of the Coast. Lo
          que imprimimos son proxies para jugar, no cartas oficiales.
        </p>
      </article>

      <Footer />
    </main>
  );
}
