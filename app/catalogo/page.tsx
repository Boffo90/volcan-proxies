import {
  catalogo as catalogoDeJuego,
  esIdioma,
  esJuego,
  IDIOMA_BASE,
  JUEGO_DEFAULT,
  type IdiomaId,
  type JuegoId,
} from "@/lib/catalogo";
import Buscador from "./Buscador";

/**
 * La búsqueda y el juego se leen acá, en el servidor, y bajan como props.
 *
 * Leerlos con `useSearchParams` dentro del componente de cliente deja la
 * página prerenderizada y a la espera de la hidratación; usar el prop
 * `searchParams` la vuelve dinámica y el HTML ya sale con el catálogo correcto.
 */
export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const pedido = typeof params.juego === "string" ? params.juego : "";
  const juego: JuegoId = esJuego(pedido) ? pedido : JUEGO_DEFAULT;

  // El idioma se valida contra lo que este catálogo sirve de verdad: alguien
  // puede escribir ?idioma=ja en un catálogo que no lo tiene.
  const idiomaPedido = typeof params.idioma === "string" ? params.idioma : "";
  const soportados = catalogoDeJuego(juego).idiomas;
  const idioma: IdiomaId =
    esIdioma(idiomaPedido) && soportados.includes(idiomaPedido)
      ? idiomaPedido
      : IDIOMA_BASE;

  return <Buscador q={q} juego={juego} idioma={idioma} />;
}
