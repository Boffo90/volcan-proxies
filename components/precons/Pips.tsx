import type { ColorMana } from "@/lib/precons";

const NOMBRE: Record<ColorMana | "C", string> = {
  W: "blanco",
  U: "azul",
  B: "negro",
  R: "rojo",
  G: "verde",
  C: "incoloro",
};

/** La identidad de color de un mazo, con los símbolos de maná de verdad. */
export default function Pips({
  colores,
  size = 18,
}: {
  colores: ColorMana[];
  size?: number;
}) {
  const lista: (ColorMana | "C")[] = colores.length ? colores : ["C"];
  return (
    <span
      className="inline-flex items-center gap-0.5 align-middle"
      role="img"
      aria-label={"Colores: " + lista.map((c) => NOMBRE[c]).join(", ")}
    >
      {lista.map((c) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={c}
          src={`https://svgs.scryfall.io/card-symbols/${c}.svg`}
          alt=""
          width={size}
          height={size}
          className="rounded-full shadow-[1px_1px_0_var(--ink)]"
        />
      ))}
    </span>
  );
}
