/**
* Detecta el error de "esa columna no existe todavía".
*
* Pasa cuando el código ya usa una columna cuya migración aún no se corrió en
* Supabase. PostgREST lo reporta con 42703 en un SELECT y con PGRST204 en un
* INSERT (por su caché de esquema), así que hay que cubrir ambos; el mensaje
* queda como respaldo por si cambian los códigos.
*
* Permite desplegar código nuevo antes de correr la migración: la consulta
* reintenta sin esa columna en vez de romper la página.
*/
export function esColumnaFaltante(
  error: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  return (
	error.code === "42703" ||
	error.code === "PGRST204" ||
	/column|schema cache/i.test(error.message || "")
  );
}
