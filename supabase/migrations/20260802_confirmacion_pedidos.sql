-- Marca de cuándo se le avisó al cliente que su pago quedó confirmado.
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor > New query).
-- Sirve para no mandar el email de confirmación dos veces: el envío se
-- "reclama" con un update condicional sobre esta columna (importante porque
-- Flow reintenta su webhook). El código funciona sin ella, pero entonces
-- pierde esa protección y un reintento podría repetir el correo.

alter table pedidos
  add column if not exists confirmacion_enviada_at timestamptz;
