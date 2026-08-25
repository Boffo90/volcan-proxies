# Contexto del proyecto — Volcán Proxies

Documento de traspaso. Si estás retomando el proyecto en una sesión nueva,
lee esto antes de tocar código: acá está lo que no se deduce leyendo los
archivos.

Última actualización: 24 de agosto de 2026.

---

## 1. Qué es

Tienda online de **proxies de Magic: The Gathering** (y otros TCG), hechas a
mano en **Pucón, Chile**, con despacho a todo el país. La opera una sola
persona: **Sebastián (Seba)**. Todo el sitio y la comunicación con clientes
está en **español de Chile**.

El negocio es real y está en producción con clientes pagando. Cada cambio que
se despliega afecta pedidos y plata de verdad.

---

## 2. Stack

- **Next.js 16.2.9** — ojo con esto: tiene cambios de API respecto de versiones
  anteriores. El middleware, por ejemplo, vive en `proxy.ts` (función `proxy`),
  no en `middleware.ts`. Antes de escribir código de Next, revisa
  `node_modules/next/dist/docs/`. Está advertido en `AGENTS.md`.
- **Supabase** — base de datos y auth de clientes.
- **Flow.cl** — pasarela de pago chilena.
- **Resend** — correos transaccionales.
- **Vercel** — hosting. **Desplegar = hacer push a `main`**; Vercel construye
  solo. No hay pipeline manual.

### Migraciones

No se aplican solas. Los `.sql` de `supabase/migrations/` **los corre Seba a
mano** en el SQL Editor del dashboard de Supabase. El código está escrito para
sobrevivir sin la migración: ver `lib/db.ts` (`esColumnaFaltante`), que detecta
el error de columna inexistente y reintenta la consulta sin ese filtro.

Ya aplicadas: `confirmacion_enviada_at` y `archivado_at` en `pedidos`.

---

## 3. Decisión de arquitectura más importante: precios en base de datos

**Los precios NO viven en el código.** Viven en la tabla `config` de Supabase,
en la fila `key = 'precios'`, como JSON. El código tiene defaults que solo
funcionan de respaldo si Supabase falla.

Esto importa mucho: **cambiar un precio no requiere desplegar**, y al revés,
cambiar el default en el código no cambia lo que se cobra. Si un precio no
calza con lo que esperas, mira la base primero.

`normalizePrecios()` en `lib/pricing.ts` acepta tanto el formato actual
(registros por acabado) como el viejo y plano de dos acabados, y rellena lo que
falte. No lo borres: protege contra configs a medio migrar.

### Otras claves en `config`

| Clave | Qué guarda | Estado |
|---|---|---|
| `precios` | precios, promos y disponibilidad por acabado | en uso |
| `stock` | inventario de materias primas y mínimos | en uso |
| `formulas` | recetas de producción por juego | se crea al primer guardado desde el panel |
| `banco` | datos de la cuenta para transferencia | **huérfana: ningún código la lee** |

Lo de `banco` es una brecha real. Los datos bancarios están **hardcodeados** en
`app/gracias/page.tsx` y en el correo de `app/api/pedido/route.ts`. Si Seba
cambia de cuenta, hay que tocar código. Vale la pena cablearlo algún día.

---

## 4. Sistema de acabados

`FINISHES` en `lib/pricing.ts` es la fuente de verdad. Agregar un acabado es
agregar una clave ahí; TypeScript después te obliga a completar todos los
`Record<Finish, …>` (precios, `FINISH_INFO`, `RECETA` en `lib/stock.ts`,
`DETALLE` en la página de acabados). Ese error en cascada es intencional.

`FINISH_INFO` tiene el nombre, el pro y **la contra real** de cada proceso. La
contra se muestra al cliente a propósito: es lo que hace creíble la diferencia
de precio. No la suavices.

### Estado del catálogo (24-ago-2026)

| Clave | Nombre visible | Precio | Estado |
|---|---|---|---|
| `base300` | Básica 300g | $130 | **activo** |
| `reforzada300` | Premium 300g | $250 | **activo** |
| `glossy` | Glossy | $200 | pausado |
| `matte` | Matte | $250 | pausado |
| `premium` | Matte Premium | $400 | **descontinuado** |

**Por qué están pausados Glossy y Matte:** la laminadora dejó de sellar bien y
el film se desprende. Vuelven con un clic desde `/admin/precios` cuando se
repare. `premium` es distinto: se retiró para siempre (el doble laminado daba
el mismo resultado que `reforzada300` con el doble de trabajo). Tiene
`descontinuado: true` y **no hay que reactivarlo**; existe solo para que los 2
pedidos históricos que lo usaron sigan mostrando su acabado real.

La página `/acabados` distingue ambos casos: los pausados se anuncian como
"vuelven pronto", el descontinuado ni se menciona.

---

## 5. Lógica de negocio que no es obvia

### Promos acumulables

`calculateTotalWith()` resuelve un problema de cambio de monedas: para cada
acabado busca la combinación más barata de promos (60 y 100) más cartas
sueltas. Un pedido de 260 cartas se resuelve solo como 2×Commander 100 +
1×Mazo 60.

Invariantes que hay que preservar si se toca:

1. Nunca cobrar más que todas las cartas sueltas.
2. Agregar una carta nunca sube el total más que el precio de esa carta.
3. Nunca conviene dividir el pedido en dos compras.

Antes esto estaba roto: la promo exigía *exactamente* 60 o 100 cartas de un
solo acabado y sin customs, así que 260 cartas juntas costaban **$12.300 más**
que en tres compras separadas.

Las cartas custom se cobran aparte (unitario + recargo) y **no suman ni anulan**
las promos del resto.

### Envío agrupado

Si un cliente ya tiene un pedido **pagado**, sin despachar y a la **misma
dirección exacta**, el pedido nuevo no paga envío: va en la misma caja.

La palabra clave es **pagado**. Al principio bastaba con cualquier pedido sin
despachar, y eso era explotable: crear un pedido, no pagarlo, y pedir un segundo
gratis. El caso accidental era peor todavía — a alguien le fallaba Flow,
rearmaba el pedido, y el envío lo terminaba pagando la casa.

La dirección se compara normalizada (`normalizarDireccion`), sin tildes ni
mayúsculas, pero **completa**. Direcciones parecidas no agrupan: son dos
entregas y el courier cobra las dos.

### Reintento de pago

Cuando falla un pago en Flow, el cliente puede reintentar desde
`/seguimiento/{numero}` o desde `/gracias`, sin rearmar el carrito.
`/api/pedido/pagar` genera un link de pago nuevo contra el pedido existente.

Esto arregló un problema grave: antes `/gracias` decía "¡Gracias por tu
compra!" leyendo solo la URL, sin comprobar nada. Un cliente cuyo pago falló
quedaba creyendo que había comprado, con el carrito vacío y sin salida. Por eso
había tantos pedidos abandonados.

`/gracias` ahora consulta el estado real, y como la confirmación de Flow llega
por webhook y puede demorar más que el redirect, muestra "Verificando tu pago"
y reintenta 5 veces en ~10 segundos antes de concluir que falló.

---

## 6. Trampas conocidas

**`EMAIL_FROM` debe ser de un dominio verificado en Resend.** Estuvo meses en
`onboarding@resend.dev`, que solo permite enviar a la casilla del dueño de la
cuenta. Resultado: **ningún cliente recibió jamás un correo** — ni confirmación
de pedido, ni de pago, ni tracking — y el `catch` lo escribía en un log que
nadie miraba. Ya está corregido y verificado, y ahora un fallo de envío queda
anotado en las notas del pedido para que se vea en el panel.

**El `.env.local` apunta al SANDBOX de Flow.** Producción usa el Flow real.
Consultar el estado de un pago de producción desde local devuelve
"Transaction not found" — no es un bug. Como efecto secundario útil, correr el
servidor local no puede cobrarle a un cliente real.

**El panel está tras contraseña de admin.** El asistente no debe escribirla.
Todo lo del panel se verifica por API, por lógica o por consulta a la base;
la pantalla la prueba Seba.

**El lint tiene errores preexistentes** de `setState` dentro de `useEffect` en
casi todas las páginas. Son del estilo del proyecto y no bloquean el build. No
los confundas con algo que rompiste.

**Los datos bancarios llevan `smyanezo@gmail.com` a propósito.** Ese es el
correo de la cuenta MACH, que valida el destinatario al transferir. El de
contacto es `volcanproxies@gmail.com`. **No los unifiques** sin preguntar.

**El tiempo de impresión no es mano de obra.** La impresora tarda ~6 min por
hoja, pero Seba avanza en otra cosa mientras tanto. Los costos se calculan con
el tiempo de sus manos (~2-3 min/hoja), no con el de la máquina. Eso sí, esos
6 minutos son el techo real de producción y explican por qué se acumulan los
pedidos.

---

## 7. Modelo de costos

Todo se calcula por **hoja A4 = 9 cartas**, y las hojas se **redondean hacia
arriba**: 60 cartas ocupan 7 hojas, no 6,67. La estimación es conservadora a
propósito.

Insumos con flete a Pucón (+18% estimado, ajustable):

| Insumo | Costo | Nota |
|---|---|---|
| Papel 300g semibrillante | $3.900 / 50 hojas | el que se usa hoy |
| Pouch termolaminar | $12.970 / 100 láminas | Liberman |
| Laminado en frío | $8.445 / 50 hojas | sin uso hoy |
| Tinta Epson T544 | $8.490 / ~300 hojas | rendimiento estimado a sangre |

La métrica que se usa para decidir precios **no es el margen por carta sino la
ganancia por hora de trabajo**, porque el cuello de botella es el tiempo de
Seba. Fue lo que reveló que el antiguo Premium, pese a tener el mayor margen
por carta, era el producto **menos** rentable por hora.

Hay una calculadora interactiva publicada como artifact:
https://claude.ai/code/artifact/91c5b420-5d80-4d0b-bf90-191b7e357612

---

## 8. Panel de administración

`/admin` — tablero por estado. Botones: Precios, Customs, Fórmulas, Stock,
Archivados.

| Página | Para qué |
|---|---|
| `/admin/precios` | precios, promos y disponibilidad por acabado |
| `/admin/stock` | inventario y **cuánto material consume la cola de pedidos** |
| `/admin/formulas` | recetas de producción por juego, editables |
| `/admin/pedido/[id]` | el detalle, que es donde está casi todo |

### En el detalle del pedido

- **Verificación de Flow en vivo:** consulta a Flow el estado real del pago al
  abrir. Alarma roja si el pedido está en un estado que asume el pago y Flow no
  lo confirma. Nació de un caso real: el #43 se produjo sin estar pagado.
- **Confirmar pago y avisar al cliente:** marca pagado y manda el correo. Se
  reclama con un update condicional para no duplicar el envío (Flow reintenta
  su webhook), y **se libera la marca si el envío falla**, o el pedido quedaría
  como avisado sin haberlo sido.
- **Importar a Cardwright:** separado por fuente. Las cartas con arte MPCFill
  salen como XML de orden (formato mpc-autofill, con el Drive id de cada
  diseño); las de Scryfall como decklist MTGO. Son dos vías distintas de import
  en Cardwright y ambas caen en la misma cola.
- **Editar envío**, bloqueado si ya hay tracking, y con registro del cambio en
  las notas internas.
- **Archivar**, que saca el pedido del panel sin borrarlo y deja de reservar
  material y de agrupar envíos.

**Cardwright** es la app de escritorio de Seba para imprimir (vive en
`C:/Users/smyo9/upscaler`). El XML y la decklist que genera el panel están
hechos a la medida de sus parsers reales.

---

## 9. Cómo trabajar con Seba

- **Nunca despliega solo.** Se construye, se verifica, se le muestra qué
  cambió, y **él dice explícitamente "súbelo a producción"**. Respetar eso.
- **Verificar de verdad antes de mostrar.** Typecheck y lint son el piso, no el
  techo: se prueban las funciones con datos reales de su base, se levanta el
  servidor, se revisa la página. Varios errores de esta sesión aparecieron solo
  al mirar el navegador.
- **Los datos de producción son sagrados.** Antes de escribir en Supabase se
  guarda un respaldo y se muestra el antes/después. Nunca se crean pedidos de
  prueba ni se envían correos a clientes reales sin pedirlo.
- **Él decide el negocio.** Los números y las recomendaciones se entregan con
  el razonamiento a la vista, pero el precio final, el posicionamiento y qué se
  vende son suyos. Cuando dijo que $1.300 la carta era demasiado, tenía razón
  sobre su mercado.
- **Escribe en español, directo y sin adornos.**

---

## 10. Pendientes

- **Fotos de los acabados**: subir `base300.jpg` y `reforzada300.jpg` a
  `public/acabados/`. La comparativa en `/acabados` aparece sola cuando los
  archivos existen (los detecta el navegador, no hay que tocar código).
- **Cargar el stock inicial** en `/admin/stock`; hasta entonces la columna
  "Queda" no significa nada.
- **Cartas con dorso real**: en pausa hasta tener mejor impresora. Precio
  calculado $900/carta, con el costo dominado por el rechazo al pegar los dos
  papeles. Si se retoma, hay que rehacer los números.
- **Cablear `config.banco`** para no tener los datos de transferencia
  hardcodeados.
- **Curvatura del Premium 300g**: el laminado por una cara curva la hoja. La
  técnica recomendada es enfriar bajo presión apenas sale del laminador, sobre
  una superficie fría y pesada. Falta confirmar si resultó.
