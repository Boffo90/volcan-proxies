-- Copia local del catálogo de Riftbound.
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor > New query).
--
-- Por qué existe: Riftcodex responde 403 desde los servidores de Vercel. Está
-- detrás de Cloudflare y bloquea el tráfico de datacenter, así que el sitio no
-- puede consultarlo en vivo aunque desde una máquina con IP residencial ande
-- perfecto. La sincronización corre desde la máquina de Seba (que sí pasa) y
-- el sitio lee de acá.
--
-- Son ~1.450 cartas y cambian solo cuando sale un set nuevo, así que una copia
-- que se refresca a mano es más confiable que depender de un tercero frágil en
-- cada visita. La sincronización es `node scripts/sync-riftbound.mjs`.

create table if not exists riftbound_cartas (
  -- El id de Riftcodex, que es lo que ya guardan los pedidos en su uid.
  id text primary key,
  nombre text not null,
  -- El nombre sin tildes ni mayúsculas: es contra esto que se busca, para que
  -- "jinx rebel" encuentre "Jinx - Rebel".
  nombre_busqueda text not null,
  set_id text,
  -- La carta entera, tal como la devuelve Riftcodex.
  --
  -- Se guarda cruda a propósito: el adaptador ya sabe convertirla, así que
  -- cualquier arreglo en esa conversión (los símbolos del texto, el
  -- deduplicado por ilustración) vale para lo ya guardado sin resincronizar.
  datos jsonb not null,
  actualizado_at timestamptz not null default now()
);

create index if not exists riftbound_cartas_busqueda_idx
  on riftbound_cartas (nombre_busqueda text_pattern_ops);
create index if not exists riftbound_cartas_set_idx on riftbound_cartas (set_id);

-- El catálogo es público: cualquiera que entre al sitio lo ve. Escribir, solo
-- la sincronización con la service role key, que se salta RLS.
alter table riftbound_cartas enable row level security;

drop policy if exists "riftbound lectura pública" on riftbound_cartas;
create policy "riftbound lectura pública"
  on riftbound_cartas for select
  using (true);
