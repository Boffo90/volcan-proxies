-- Login de clientes + carrito persistente — Fase 5 del roadmap.
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor > New query).
-- Requiere que Supabase Auth esté habilitado (viene activo por defecto).

create table if not exists carritos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table pedidos add column if not exists user_id uuid references auth.users(id);
create index if not exists pedidos_user_id_idx on pedidos(user_id);
