"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Truck,
  MapPin,
  Search,
  Sparkles,
  FileText,
  Printer,
  Package,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import { motion } from "motion/react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Reveal from "@/components/animation/Reveal";
import { IDIOMA_BASE, JUEGO_DEFAULT, type CartaCatalogo } from "@/lib/catalogo";
import { aleatorias } from "@/lib/catalogo/cliente";
import { usePrecios } from "@/hooks/usePrecios";
import { usePlazos } from "@/hooks/usePlazos";
import { promesa, plazoCorto } from "@/lib/plazos";
import { FINISHES, FINISH_INFO, formatCLP } from "@/lib/pricing";

export default function Home() {
  const router = useRouter();
  const { precios } = usePrecios();
  // El plazo ya no se escribe acá: lo publica Seba desde /admin/plazos y lo
  // leen también el checkout, la FAQ, nosotros y el correo de confirmación.
  const { plazos } = usePlazos();

  // Los acabados que se venden hoy. La portada los nombraba a mano y quedó
  // ofreciendo dos que están pausados; que salgan de los precios.
  const acabadosVivos = FINISHES.filter((f) => precios.disponible[f]).map(
    (f) => FINISH_INFO[f].label
  );
  const [showcase, setShowcase] = useState<CartaCatalogo[]>([]);

  useEffect(() => {
    aleatorias(JUEGO_DEFAULT, 6, IDIOMA_BASE).then((cards) => setShowcase(cards));
  }, []);

  // Cada beneficio lleva su propio color de maná. Con todo en naranjo la fila
  // se leía como un solo bloque; con cuatro colores se leen como cuatro cosas
  // distintas, que es lo que son.
  const features = [
    {
      icon: Flame,
      title: "Impresión Premium",
      desc: "Papel semi-brillante de alto gramaje, impreso en alta calidad.",
      tint: "var(--mana-r)",
    },
    {
      icon: MapPin,
      title: "Hecho en Pucón",
      desc: "Desde el sur de Chile para todo el país.",
      tint: "var(--mana-g)",
    },
    {
      icon: Truck,
      title: `Despacho en ${plazoCorto(plazos)}`,
      desc: "Envío vía Starken, Chilexpress o Blue Express.",
      tint: "var(--mana-u)",
    },
    {
      icon: CheckCircle2,
      title: "Mínimo 8 cartas",
      desc: "1 hoja completa, máximo aprovechamiento.",
      tint: "var(--mana-b)",
    },
  ];

  const pasos = [
    {
      icon: FileText,
      title: "Pega tu lista o busca",
      desc: "Importa tu mazo de Moxfield/Archidekt o navega el catálogo Scryfall completo.",
    },
    {
      icon: ShoppingCart,
      title: "Elige acabado",
      desc: `${acabadosVivos.join(", ")}. Mezcla cantidades libremente.`,
    },
    {
      icon: Printer,
      title: `Imprimimos ${promesa(plazos)}`,
      desc: "Impresión fotográfica y acabado a mano, carta por carta.",
    },
    {
      icon: Package,
      title: "Despachamos a tu casa",
      desc: "Starken, Chilexpress o Blue Express a todo Chile, con tracking incluido.",
    },
  ];

  const perCard = (total: number, cantidad: number) =>
    "~" + formatCLP(Math.round(total / cantidad)) + "/carta";

  // Un Commander 100 por acabado: es la forma más directa de mostrar la
  // escalera completa de calidad y precio.
  const promos = FINISHES.filter((f) => precios.disponible[f]).map((f) => ({
    name: "Commander 100",
    subtitle: FINISH_INFO[f].label,
    price: formatCLP(precios.commander100[f]),
    desc: FINISH_INFO[f].pro,
    qty: "100 cartas",
    perCard: perCard(precios.commander100[f], 100),
    // La Reforzada es la que mejor equilibra precio y sensación de carta real.
    featured: f === "reforzada300",
  }));

  // La mano abierta del hero: cinco cartas en abanico desde el centro. Son
  // grados y porcentajes a mano porque un abanico parejo se ve calculado; la
  // del medio queda recta y arriba, como cuando uno sostiene la mano.
  const abanico = [
    { rot: -14, x: "-104%", y: 26, z: 1 },
    { rot: -7, x: "-54%", y: 6, z: 2 },
    { rot: 0, x: "-4%", y: -4, z: 3 },
    { rot: 7, x: "46%", y: 6, z: 2 },
    { rot: 14, x: "96%", y: 26, z: 1 },
  ];

  return (
    <main className="min-h-screen bg-surface text-ink-soft">
      <NavBar />

      {/* HERO — sobre el mantel, sin velos de color encima */}
      <section className="relative px-6 pt-16 pb-24 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <span className="badge bg-mana-w px-4 py-2 text-xs text-ink mb-7 -rotate-2">
              🌋 Hecho en Pucón · Envíos a todo Chile
            </span>
            {/* Sin <br/> a mano: los saltos fijos dejaban "alma" sola en una
                línea apenas cambiaba el ancho. text-balance reparte solo. */}
            <h1 className="font-display font-extrabold text-5xl md:text-6xl lg:text-[4.2rem] mb-6 leading-[0.98] text-ink text-balance">
              Tu mazo soñado,{" "}
              <span className="text-lava">
                sin venderle el alma a la billetera.
              </span>
            </h1>
            <p className="text-lg text-ink-muted mb-8 max-w-lg">
              Proxies de Magic, Pokémon, Yu-Gi-Oh!, Riftbound y Mitos y
              Leyendas, impresas en papel de alto gramaje y terminadas a mano.
              Importa tu mazo entero desde Moxfield o Archidekt en segundos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push("/importar")}
                className="btn-flame px-7 py-4 flex items-center justify-center gap-2"
              >
                <FileText size={20} /> Importar mi mazo
              </button>
              <button
                onClick={() => router.push("/catalogo")}
                className="btn-ghost px-7 py-4 flex items-center justify-center gap-2"
              >
                <Search size={20} /> Buscar cartas
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="relative hidden lg:block">
            <div className="relative h-[430px]">
              {abanico.map((pos, idx) => {
                const card = showcase[idx];
                return (
                  <motion.div
                    key={idx}
                    className="absolute left-1/2 top-1/2 w-[200px] aspect-[5/7] rounded-xl bg-center bg-cover bg-no-repeat border-2 border-ink bg-surface-3"
                    style={{
                      backgroundImage: card
                        ? `url(${card.imagenes.normal})`
                        : undefined,
                      zIndex: pos.z,
                      boxShadow: "4px 6px 0 var(--ink)",
                    }}
                    initial={false}
                    animate={{
                      x: pos.x,
                      y: `calc(-50% + ${pos.y}px)`,
                      rotate: pos.rot,
                    }}
                    whileHover={{ y: `calc(-50% + ${pos.y - 26}px)`, zIndex: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  />
                );
              })}
            </div>
            <div className="badge absolute -bottom-2 right-2 z-20 bg-flame text-white px-4 py-2.5 rotate-3 text-sm">
              🎴 +30.000 cartas disponibles
            </div>
          </Reveal>
        </div>
      </section>

      {/* BANNER IMPORTADOR — el primer bloque de color pleno */}
      <section className="px-6 py-9 bg-flame border-y-2 border-ink">
        <Reveal className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <FileText size={34} className="text-white flex-shrink-0" />
            <div>
              <h3 className="font-display font-extrabold text-xl text-white">
                ¿Ya tienes tu mazo en Moxfield o Archidekt?
              </h3>
              <p className="text-sm text-white/90">
                Pega tu lista y arma tu pedido en 30 segundos.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/importar")}
            className="btn-ghost px-6 py-3 whitespace-nowrap"
          >
            Importar ahora →
          </button>
        </Reveal>
      </section>

      {/* FEATURES — cada uno con su color, no cuatro naranjos iguales */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc, tint }, idx) => (
            <Reveal key={title} delay={idx * 0.08}>
              <div className="block-card glow-hover h-full p-6">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl border-2 border-ink mb-4"
                  style={{ backgroundColor: tint }}
                >
                  <Icon className="text-white" size={26} />
                </div>
                <h3 className="font-display font-extrabold text-lg text-ink mb-1.5">
                  {title}
                </h3>
                <p className="text-sm text-ink-muted">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-3 text-ink">
            Cómo <span className="text-lava">funciona</span>
          </h2>
          <p className="text-ink-muted">4 pasos simples. Sin complicaciones.</p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pasos.map((paso, idx) => {
            const Icon = paso.icon;
            return (
              <Reveal key={paso.title} delay={idx * 0.08}>
                <div className="relative block-card glow-hover h-full p-6 pt-7">
                  <span className="badge absolute -top-4 -left-3 bg-ink text-ink-invert w-9 h-9 justify-center font-display text-base -rotate-6">
                    {idx + 1}
                  </span>
                  <Icon className="text-flame-ink mb-4" size={30} />
                  <h3 className="font-display font-extrabold text-lg text-ink mb-1.5">
                    {paso.title}
                  </h3>
                  <p className="text-sm text-ink-muted">{paso.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* PROMOS — banda hundida, y la destacada invertida en tinta */}
      <section className="px-6 py-20 bg-surface-3 border-y-2 border-ink">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <Sparkles className="mx-auto text-flame-ink mb-3" size={36} />
            <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-3 text-ink">
              Promos para <span className="text-lava">armar mazo</span>
            </h2>
            <p className="text-ink-muted">
              Mientras más cartas, mejor precio. Aplican automáticamente.
            </p>
          </Reveal>

          {/* Las columnas siguen a la cantidad de acabados vivos: con cuatro
              fijas quedaban huecos a la derecha al pausar acabados. */}
          <div
            className={
              "grid sm:grid-cols-2 gap-5 mb-10 items-start " +
              (promos.length >= 4
                ? "lg:grid-cols-4"
                : promos.length === 3
                ? "lg:grid-cols-3"
                : "max-w-2xl mx-auto")
            }
          >
            {promos.map((p, idx) => (
              <Reveal key={p.name + p.subtitle} delay={idx * 0.1}>
                <div
                  className={
                    "relative h-full p-6 glow-hover " +
                    (p.featured
                      ? "block-ink shadow-[var(--lift-lg)]"
                      : "block-card")
                  }
                >
                  {p.featured && (
                    <span className="badge absolute -top-4 left-1/2 -translate-x-1/2 bg-mana-w text-ink text-xs px-3 py-1.5 whitespace-nowrap -rotate-2">
                      ⭐ MÁS POPULAR
                    </span>
                  )}
                  <p
                    className={
                      "text-xs uppercase tracking-wider font-bold " +
                      (p.featured ? "text-mana-w" : "text-ink-faint")
                    }
                  >
                    {p.subtitle}
                  </p>
                  <h3
                    className={
                      "font-display font-extrabold text-2xl mt-1 mb-3 " +
                      (p.featured ? "text-ink-invert" : "text-ink")
                    }
                  >
                    {p.name}
                  </h3>
                  <p
                    className={
                      "text-4xl font-display font-extrabold mb-1 " +
                      (p.featured ? "text-flame" : "text-lava")
                    }
                  >
                    {p.price}
                  </p>
                  <p
                    className={
                      "text-xs mb-4 " +
                      (p.featured ? "text-ink-invert/60" : "text-ink-faint")
                    }
                  >
                    {p.perCard}
                  </p>
                  <div
                    className={
                      "border-t pt-4 space-y-2 text-sm " +
                      (p.featured
                        ? "border-white/20 text-ink-invert/85"
                        : "border-line text-ink-soft")
                    }
                  >
                    {[p.qty, p.desc, "Mismo acabado en todas"].map((linea) => (
                      <p key={linea} className="flex items-start gap-2">
                        <CheckCircle2
                          size={15}
                          className={
                            "mt-0.5 flex-shrink-0 " +
                            (p.featured ? "text-flame" : "text-flame-ink")
                          }
                        />
                        {linea}
                      </p>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push("/promos")}
              className="font-bold text-flame-ink underline underline-offset-4 decoration-2 hover:text-flame-deep"
            >
              Ver detalle de promos →
            </button>
          </div>
        </div>
      </section>

      {/* CATÁLOGO TEASER — cartas repartidas sobre la mesa */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <Reveal className="text-center mb-12">
          <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-3 text-ink">
            Catálogo <span className="text-lava">completo</span>
          </h2>
          <p className="text-ink-muted">
            Catálogo vía Scryfall — todas las cartas, todos los sets, todos los
            artes alternativos.
          </p>
        </Reveal>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-10">
          {Array.from({ length: 6 }).map((_, idx) => {
            const card = showcase[idx];
            // Un giro distinto por carta: repartidas a mano sobre la mesa, no
            // pegadas a la grilla.
            const giro = [-3, 2, -1.5, 3, -2, 1.5][idx];
            return (
              <Reveal key={idx} delay={idx * 0.05}>
                <motion.div
                  whileHover={{ y: -8, rotate: 0, scale: 1.04 }}
                  animate={{ rotate: giro }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="aspect-[5/7] rounded-lg bg-center bg-cover bg-no-repeat border-2 border-ink bg-surface-3 cursor-pointer shadow-[3px_4px_0_var(--ink)]"
                  style={{
                    backgroundImage: card
                      ? `url(${card.imagenes.normal})`
                      : undefined,
                  }}
                  onClick={() => router.push("/catalogo")}
                />
              </Reveal>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push("/catalogo")}
            className="btn-flame px-7 py-3.5 inline-flex items-center gap-2"
          >
            <Search size={18} /> Explorar catálogo
          </button>
        </div>
      </section>

      {/* DISCLAIMER ARTESANAL */}
      <section className="px-6 pb-20 max-w-4xl mx-auto">
        <Reveal className="block-card p-8 md:p-10">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl mb-6 text-center text-ink">
            Sobre nuestras <span className="text-lava">cartas</span>
          </h2>
          <p className="text-ink-soft mb-8 text-center max-w-2xl mx-auto">
            Volcán Proxies son <b className="text-ink">proxies artesanales</b>{" "}
            hechas a mano en Pucón con impresión fotográfica sobre papel de alto
            gramaje. Queremos ser transparentes sobre qué esperar:
          </p>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-surface p-6 rounded-xl border-2 border-green-700/35">
              <h3 className="font-display font-extrabold text-green-700 mb-3 flex items-center gap-2">
                ✅ Lo que sí hacemos
              </h3>
              <ul className="space-y-2 text-sm text-ink-soft">
                <li>• Cartas dobles MDFC (Modal Double-Faced) con su reverso real impreso</li>
                <li>• Firmeza similar a una carta real al barajar</li>
                <li>• Diseño visual fiel desde distancia normal de juego</li>
              </ul>
            </div>

            <div className="bg-surface p-6 rounded-xl border-2 border-amber-700/35">
              <h3 className="font-display font-extrabold text-amber-700 mb-3 flex items-center gap-2">
                ⚠️ Lo que NO buscamos
              </h3>
              <ul className="space-y-2 text-sm text-ink-soft">
                <li>• Replicar la calidad industrial de Wizards/Konami</li>
                <li>• Engañar de que son cartas oficiales</li>
                <li>• Pasar como reales en torneos sancionados</li>
                <li>• Reemplazar la experiencia de una carta original</li>
              </ul>
            </div>
          </div>

          <p className="text-center text-ink-soft text-sm mt-6">
            <b className="text-ink">Sobre el reverso:</b> por defecto nuestras
            cartas de una sola cara llevan{" "}
            <b className="text-ink">reverso blanco liso</b> (no el reverso
            oficial de Magic), y si quieres puedes subir tu propio{" "}
            <b className="text-ink">dorso personalizado</b> desde el carrito por
            un extra. Las únicas cartas de doble cara que imprimimos con su
            reverso real son las <b className="text-ink">MDFC</b>{" "}
            (Modal Double-Faced Cards), que no pagan extra — no hacemos
            transform, flip ni otros tipos de carta doble.
          </p>

          <p className="text-center text-ink-faint text-sm mt-4 italic">
            Son perfectas para playtest, casual, EDH/cEDH, kitchen table y
            torneos proxy-friendly.
          </p>
        </Reveal>
      </section>

      {/* CTA FINAL — el bloque oscuro que cierra, contrapunto del mantel */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <Reveal className="block-ink shadow-[var(--lift-lg)] px-6 py-16 text-center">
          <div
            className="w-20 h-20 mx-auto mb-5 bg-center bg-contain bg-no-repeat rounded-2xl border-2 border-white/15"
            style={{ backgroundImage: "url(/logo.png)" }}
            role="img"
            aria-label="Volcán Proxies"
          />
          <h2 className="font-display font-extrabold text-3xl md:text-5xl mb-4 text-ink-invert text-balance">
            ¿Listo para armar tu próximo mazo?
          </h2>
          <p className="text-ink-invert/70 mb-9 text-lg max-w-xl mx-auto">
            Importa tu lista o navega el catálogo. Pedido mínimo: 8 cartas (1
            hoja completa).
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/importar")}
              className="btn-flame px-7 py-4 flex items-center justify-center gap-2"
            >
              <FileText size={20} /> Importar mi mazo
            </button>
            <button
              onClick={() => router.push("/catalogo")}
              className="btn-ghost px-7 py-4 flex items-center justify-center gap-2"
            >
              <Search size={20} /> Buscar cartas
            </button>
          </div>
        </Reveal>
      </section>

      <Footer />
    </main>
  );
}
