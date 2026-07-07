-- Catálogo de customs (galería curada) — Fase 4 del roadmap.
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor > New query).

create table if not exists customs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  tags text[] not null default '{}',
  image_url text not null,
  finish_options text[] not null default '{glossy,matte}',
  surcharge numeric,        -- null = usa precios.custom_surcharge global
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customs_active_sort_idx on customs(active, sort_order);
