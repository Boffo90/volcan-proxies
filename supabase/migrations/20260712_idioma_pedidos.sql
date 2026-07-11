-- Preferencia de idioma de las cartas por pedido.
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor > New query).
-- El código funciona sin esta columna (guarda el idioma en las notas como
-- fallback), pero con ella el dato queda estructurado.

alter table pedidos add column if not exists idioma text;
