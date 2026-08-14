-- Archivar pedidos sin borrarlos.
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor > New query).
--
-- Un pedido archivado sale de la vista del panel y deja de contar para el
-- material en cola y para agrupar envíos, pero se conserva entero: sirve para
-- pedidos anulados o abandonados, donde eliminar sería perder el registro.
--
-- El código funciona sin esta columna (simplemente no se puede archivar), así
-- que se puede desplegar antes de correr esto.

alter table pedidos
  add column if not exists archivado_at timestamptz;

-- Los listados filtran por "no archivados", que es casi todo el tráfico.
create index if not exists pedidos_archivado_at_idx
  on pedidos (archivado_at)
  where archivado_at is null;
