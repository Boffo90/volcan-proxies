import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Pips from "@/components/precons/Pips";
import PedirPrecon from "@/components/precons/PedirPrecon";
import ListaMazo from "@/components/precons/ListaMazo";
import { MAZOS, etiquetaFormato, rutaMazo, type Mazo } from "@/lib/mazos";
import { espanolCompleto, imagenDeScryfall, nombreComandantes } from "@/lib/precons";

type Params = { slug: string };

// Igual que los precons: los mazos son los del índice, todos salen del build.
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return MAZOS.map((m) => ({ slug: m.slug }));
}

async function leerMazo(slug: string): Promise<Mazo | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const archivo = path.join(process.cwd(), "public", "mazos", slug + ".json");
    return JSON.parse(await readFile(archivo, "utf8")) as Mazo;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = MAZOS.find((x) => x.slug === slug);
  if (!m) return {};
  return {
    title: `${m.nombre}: mazo ${etiquetaFormato(m.formato)} listo para imprimir`,
    description:
      `Mazo de Commander ${etiquetaFormato(m.formato)} de ${nombreComandantes(m)} ` +
      `(${m.arquetipo}): lista completa de ${m.total} cartas, cómo juega y cómo ` +
      "gana. Te lo imprimimos en proxies y lo despachamos a todo Chile.",
    alternates: { canonical: rutaMazo(m) },
    openGraph: {
      title: `${m.nombre} · mazo ${etiquetaFormato(m.formato)} en proxies`,
      images: [imagenDeScryfall(m.comandantes[0].id, "art_crop")],
    },
  };
}

export default async function MazoPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const mazo = await leerMazo(slug);
  if (!mazo) notFound();

  const formato = etiquetaFormato(mazo.formato);
  const completo = espanolCompleto(mazo);
  const otros = MAZOS.filter(
    (m) => m.formato === mazo.formato && m.slug !== mazo.slug
  );

  const datos = [
    `${mazo.total} cartas`,
    `${mazo.tierras} tierras`,
    `Curva ${String(mazo.curva).replace(".", ",")}`,
    `${mazo.gameChangers.length} Game Changers`,
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
          <Link href="/mazos" className="font-bold text-flame-ink hover:underline">
            Mazos listos
          </Link>
          <ChevronRight size={14} />
          <Link
            href={"/mazos#formato-" + mazo.formato}
            className="font-bold text-flame-ink hover:underline"
          >
            {formato}
          </Link>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,340px)_1fr] gap-8 lg:gap-12 items-start">
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
              Mazo {formato} · {mazo.arquetipo}
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
                ? `Las ${mazo.total} cartas existen en español.`
                : `${mazo.enEs} de ${mazo.total} cartas existen en español; las otras ${
                    mazo.total - mazo.enEs
                  } van en inglés porque nunca salieron en español.`}
            </p>

            <PedirPrecon
              clave="mazo"
              valor={mazo.slug}
              total={mazo.total}
              enEs={mazo.enEs}
              tokens={mazo.tokens.length}
            />
          </div>
        </div>

        {/* Lo que un precon no trae y este sí: para qué sirve el mazo. */}
        <section className="mt-14 grid md:grid-cols-2 gap-6">
          <div className="block-card p-6">
            <h2 className="font-display font-extrabold text-2xl text-ink mb-3">
              Cómo juega
            </h2>
            <p className="text-ink-soft leading-relaxed">{mazo.juega}</p>
          </div>
          <div className="block-ink p-6">
            <h2 className="font-display font-extrabold text-2xl text-ink-invert mb-3">
              Cómo gana
            </h2>
            <ol className="space-y-2.5">
              {mazo.gana.map((g, i) => (
                <li key={i} className="flex gap-3 text-ink-invert/85">
                  <span className="font-display font-extrabold text-flame shrink-0">
                    {i + 1}
                  </span>
                  <span>{g}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {mazo.fuente ? (
          <p className="mt-6 text-sm text-ink-muted">
            <b className="text-ink">De dónde sale esta lista:</b> {mazo.fuente}.{" "}
            {mazo.fuenteUrl ? (
              <a
                href={mazo.fuenteUrl}
                target="_blank"
                rel="noopener nofollow"
                className="font-bold text-flame-ink underline underline-offset-2"
              >
                Ver la lista original
              </a>
            ) : null}
          </p>
        ) : null}

        {mazo.gameChangers.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display font-extrabold text-xl text-ink mb-1">
              Game Changers{" "}
              <span className="text-ink-faint">{mazo.gameChangers.length}</span>
            </h2>
            <p className="text-sm text-ink-muted mb-3">
              Las cartas de la lista oficial de Game Changers de Commander, que
              es lo que define el bracket de un mazo.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {mazo.gameChangers.map((g) => (
                <li
                  key={g}
                  className="px-2.5 py-1 rounded-md border border-line bg-surface-2 text-xs text-ink-soft"
                >
                  {g}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ListaMazo cartas={mazo.cartas} tokens={mazo.tokens} />

        {otros.length > 0 ? (
          <section className="mt-14">
            <h2 className="font-display font-extrabold text-2xl text-ink mb-4">
              Otros mazos {formato}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {otros.map((h) => (
                <Link
                  key={h.slug}
                  href={rutaMazo(h)}
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
                    <p className="text-xs text-ink-muted">{h.arquetipo}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <p className="text-xs text-ink-faint mt-12">
          <Link href="/mazos" className="font-bold text-flame-ink hover:underline">
            ← Todos los mazos
          </Link>{" "}
          · No es un producto oficial. Lo que imprimimos son proxies para
          jugar, no cartas oficiales.
        </p>
      </article>

      <Footer />
    </main>
  );
}
