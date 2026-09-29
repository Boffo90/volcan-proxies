-- El plazo que se le prometió al cliente cuando compró.
--
-- Se guarda con el pedido y no se lee del valor vigente, para que subir el
-- plazo cuando la cola crece no cambie lo que ya se le dijo a quien compró
-- antes, y para que quede registro de qué se prometió en cada caso.
alter table pedidos
  add column if not exists plazo_prometido text;

comment on column pedidos.plazo_prometido is
  'Frase del plazo vigente al momento de comprar, ej. "en máximo 48 horas". La fija /admin/plazos.';
