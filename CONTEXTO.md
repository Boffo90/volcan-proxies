# Contexto del proyecto — Volcán Proxies

Documento de traspaso. Si estás retomando el proyecto en una sesión nueva,
lee esto antes de tocar código: acá está lo que no se deduce leyendo los
archivos.

Última actualización: 5 de septiembre de 2026.

---

## 1. Qué es

Tienda online de **proxies de cartas** —Magic, Pokémon, Yu-Gi-Oh, Mitos y
Leyendas y Riftbound—
hechas a mano en **Pucón, Chile**, con despacho a todo el país. La opera una sola
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
- **API TCG** (`apitcg.com`) — catálogo de Mitos y Leyendas. Es la única
  fuente que pide llave: `APITCG_KEY`, que tiene que estar **en `.env.local` y
  en Vercel**.
- **Vercel** — hosting. **Desplegar = hacer push a `main`**; Vercel construye
  solo. No hay pipeline manual.

### Migraciones

No se aplican solas. Los `.sql` de `supabase/migrations/` **los corre Seba a
mano** en el SQL Editor del dashboard de Supabase. El código está escrito para
sobrevivir sin la migración: ver `lib/db.ts` (`esColumnaFaltante`), que detecta
el error de columna inexistente y reintenta la consulta sin ese filtro.

Ya aplicadas: `confirmacion_enviada_at` y `archivado_at` en `pedidos`, y
`riftbound_cartas` (ver la sección de catálogos).

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

## 4. Catálogos de cartas: un módulo por juego

El sitio vendía solo Magic hasta septiembre de 2026. Hoy vende cuatro juegos y
la forma está pensada para que agregar el quinto sea barato.

`lib/catalogo/tipos.ts` define el contrato y hay un módulo por juego
(`mtg.ts`, `pokemon.ts`, `ygo.ts`, `riftbound.ts`), registrados en `index.ts`.
Es la misma idea que usa Cardwright en `sources.py`. Agregar un juego es
escribir su adaptador y sumarlo a `CATALOGOS`; TypeScript después obliga a
completar el resto, igual que con los acabados.

**Todo pasa por `/api/catalogo`, nunca desde el navegador.** Dos razones que no
se ven en el código:

1. `next: { revalidate }` **no hace nada** en un componente de cliente. Antes
   el catálogo consultaba Scryfall desde el navegador y ese revalidate era
   decorativo: cada visita repetía la búsqueda. Desde el servidor sí se cachea.
2. YGOPRODeck pide explícitamente no hotlinkear sus imágenes. Por eso existe
   `/api/imagen-carta`, que las trae y las sirve desde nuestro CDN. Tiene lista
   blanca de hosts: sin eso sería un proxy abierto que cualquiera puede usar
   para descargar lo que quiera desde nuestra IP.

### De dónde salen las cartas

| Juego | Fuente | Llave | Imagen para imprimir |
|---|---|---|---|
| Magic | Scryfall | no | 745×1040 PNG |
| Pokémon | TCGdex | no | 600×825 PNG |
| Yu-Gi-Oh | YGOPRODeck | no | 813×1185 JPEG |
| Mitos y Leyendas | API TCG (apitcg.com) | **sí** | 709×1016 PNG (servidor de MyL) |
| Riftbound | copia propia en Supabase | no | 744×1039 PNG (CDN de Riot) |

`imagenes.print` va aparte de `imagenes.large` a propósito. `large` es lo que
se ve bien en pantalla; `print` es la que se manda a producir, y ahí una
miniatura no se nota hasta que la carta sale impresa y borrosa.

**El techo de Pokémon es del ecosistema, no de TCGdex**: 600×825 es lo máximo
que existe en cualquier catálogo de Pokémon, se midió contra pokemontcg.io y da
exactamente lo mismo. Está bajo lo que pide una carta de 63×88 mm a 1200 DPI,
así que el upscale trabaja desde casi 5× en vez del 4× de Magic. Se dice en el
aviso del catálogo, no se esconde.

**Los precios no cambian por juego.** Una carta de Yu-Gi-Oh mide 59×86 mm pero
entra igual 3×3 en una hoja A4, así que siguen siendo 9 cartas por hoja y el
modelo de costos vale tal cual.

### API TCG: 17 juegos, una llave, calidad muy dispar

`apitcg.com` cubre de una sola integración: Magic, Pokémon, Yu-Gi-Oh, One
Piece, Digimon, Dragon Ball (Fusion y Masters), Gundam, Lorcana, Union Arena,
Star Wars Unlimited, Final Fantasy, Flesh and Blood, hololive, **Cardfight
Vanguard** y **Mitos y Leyendas**.

**Pide llave** (`APITCG_KEY`, cuenta gratis en apitcg.com/register). Eso
bloqueaba a Cardwright — un binario repartido a desconocidos no puede guardar
una llave — pero **no al sitio**, donde vive en una variable de entorno. Tiene
que estar en **`.env.local` Y en Vercel**: son configuraciones separadas y solo
tener una es un error silencioso a medias.

Sumar otro juego de ahí es copiar `lib/catalogo/myl.ts` y cambiar el slug.

**Pero la calidad de imagen es muy dispar, y ese es el dato que decide.**
Medido sobre cuatro cartas de cada uno, tomando la mejor talla que publican:

| Juego | Mejor imagen | Upscale que necesita | Sirve? |
|---|---|---|---|
| Mitos y Leyendas | 709×1016, consistente | 4,2× | sí, el mejor de todos |
| Gundam | 600–716 | 4,2–5× | sí, algo irregular |
| One Piece | 600×838, consistente | 5,0× | sí, como Pokémon |
| Lorcana | 372–716, **muy irregular** | 4,2–8× | impredecible |
| Cardfight Vanguard | 500×729, consistente | 5,9× | sale blando |
| **Digimon** | **249–300 de ancho** | **10–12×** | **no** |

La vara: una carta de 63×88 mm a 1200 DPI necesita 2976×4160.

**No prendas todos los juegos porque estén disponibles.** Digimon a 250 px
ampliado doce veces no es una carta, es una mancha.

Y una advertencia sobre cómo evaluar: **su portada no lista todos los juegos**
(termina en "y más"). Descartar Vanguard y Mitos y Leyendas leyendo esa página
fue un error; la lista de verdad sale de `GET /api/tcgs` con la llave puesta, o
de su `openapi.json`, que es público y trae todos los endpoints y el esquema.

### Mitos y Leyendas: lo propio de este catálogo

**Las imágenes son de MyL, no de API TCG**, que solo indexa los datos. Y MyL
sirve **el mismo PNG de ~1,2 MB** en las tres tallas: sesenta de esos en una
grilla son 70 MB. Por eso las de pantalla pasan por el optimizador de Next
(`/_next/image?url=…&w=…&q=75`), que las achica a 64 KB y las cachea — y de
paso evita que el navegador de cada visitante golpee el servidor de MyL. La de
impresión va sin tocar. `api.myl.cl` está en `remotePatterns` de
`next.config.ts`; sin eso el optimizador responde 400.

**Ojo con la calidad:** Next 16 solo sirve las que estén en `images.qualities`,
y la única por defecto es **75**. Con `q=80` responde 400 y las imágenes salen
rotas sin explicación.

**Los nombres llegan todos en minúscula** ("amor de zeus"). Se capitalizan al
mostrar, pero en castellano las preposiciones van en minúscula: es "Amor de
Zeus", no "Amor De Zeus".

**Es un juego chileno, de Salo.** Vender proxies de Magic es competirle a una
multinacional al otro lado del mundo; de MyL, a una empresa en el mismo
mercado y la misma escena. Seba lo decidió sabiendo eso. No es un detalle
técnico y no debería tratarse como uno si algún día se revisa.

### Riftbound vive en nuestra base, y eso tiene una razón

**Riftcodex responde 403 a los servidores de Vercel.** Está detrás de
Cloudflare y bloquea el tráfico de datacenter. Desde una máquina con IP
residencial anda perfecto — por eso Cardwright nunca lo sufrió, y por eso en
desarrollo local no se ve.

Costó un despliegue roto descubrirlo: el catálogo andaba impecable en local y
en producción la pestaña de Riftbound salía vacía. Si algún día vuelve a pasar
con otro juego, ese es el primer sospechoso.

La salida fue copiar las cartas a la tabla `riftbound_cartas`:

- Se sincroniza con `node scripts/sync-riftbound.mjs`, **desde la máquina de
  Seba**, que sí pasa el filtro. Son ~1.450 cartas y 1,9 MB.
- Se guarda la carta **cruda** de Riftcodex en una columna `jsonb`. El
  adaptador la convierte al leer, así que cualquier arreglo en esa conversión
  vale para lo ya guardado sin resincronizar.
- Hay que volver a correrlo **cuando salga un set nuevo**. Es lo único del
  catálogo que no se actualiza solo.
- Las imágenes no pasan por ahí: son del CDN de Riot y las carga el navegador
  del cliente directo, así que el bloqueo no las toca.

Si el catálogo de Riftbound aparece vacío, lo primero que hay que mirar es si
la sincronización se corrió.

---

## 5. Sistema de acabados

`FINISHES` en `lib/pricing.ts` es la fuente de verdad. Agregar un acabado es
agregar una clave ahí; TypeScript después te obliga a completar todos los
`Record<Finish, …>` (precios, `FINISH_INFO`, `RECETA` en `lib/stock.ts`,
`DETALLE` en la página de acabados). Ese error en cascada es intencional.

`FINISH_INFO` tiene el nombre, el pro y **la contra real** de cada proceso. La
contra se muestra al cliente a propósito: es lo que hace creíble la diferencia
de precio. No la suavices.

### Estado de los acabados (5-sep-2026)

| Clave | Nombre visible | Precio | Estado |
|---|---|---|---|
| `base300` | Básica 300g | $130 | **activo** |
| `reforzada300` | Reforzada | $250 | **activo** |
| `premiumFrio` | Premium | $400 | **apagado hasta que Seba lo active** |
| `glossy` | Glossy | $200 | pausado |
| `matte` | Matte | $250 | pausado |
| `premium` | Matte Premium | $400 | **descontinuado** |

**Las claves no coinciden con los nombres, y no se pueden renombrar.** Los
pedidos guardan la clave, así que cambiarla haría que un pedido antiguo
mostrara otro acabado. Dos trampas concretas:

- `reforzada300` **ya no es de 300g**: hoy es 260g más un adhesivo por detrás.
  El "300" es historia. Se llamó "Premium 300g" hasta septiembre de 2026, con
  el nombre Y el gramaje equivocados a la vista del cliente.
- El Premium nuevo es `premiumFrio`, **no** `premium`. Esa clave la ocupa el
  Matte Premium descontinuado y reutilizarla habría cambiado la descripción de
  los pedidos históricos que lo usaron.

**Las tres recetas de hoy:**

| | Composición | Calidad de impresión |
|---|---|---|
| Básica | 300g semibrillante | Estándar |
| Reforzada | 260g + adhesivo mate por detrás | Alta |
| Premium | 200g + adhesivo + laminado en frío | Máxima |

**Ninguna lleva laminado en caliente.** Era el pouch lo que curvaba la hoja, y
ese problema ya no existe — el laminado en frío del Premium es otro proceso y
no curva. El adhesivo del refuerzo es el mismo papel en la Reforzada y en el
Premium.

**No se especifica si el refuerzo es mate o glossy**, ni al cliente ni en las
fórmulas: va por dentro y Seba usa lo que tenga a mano.

**Por qué están pausados Glossy y Matte:** la laminadora dejó de sellar bien y
el film se desprende. Vuelven con un clic desde `/admin/precios` cuando se
repare. `premium` es distinto: se retiró para siempre. Tiene
`descontinuado: true` y **no hay que reactivarlo**; existe solo para que los 2
pedidos históricos que lo usaron sigan mostrando su acabado real.

La página `/acabados` distingue ambos casos: los pausados se anuncian como
"vuelven pronto", el descontinuado ni se menciona.

### Ninguna página nombra un acabado a mano

Portada, `/promos`, `/faq` y `/acabados` derivan todo de
`precios.disponible`: los nombres, la lista de precios, las tarjetas de promo
y hasta cuántas columnas tiene la grilla. Activar un acabado en
`/admin/precios` lo hace aparecer en las cuatro sin tocar código.

Esto se hizo porque **la copia escrita a mano se pudrió sin que nadie lo
notara**. En septiembre de 2026 el sitio todavía ofrecía "Glossy (brillante)
o Matte" en la portada, en `/nosotros` y en la FAQ; prometía "laminado en
calor" en cuatro lugares incluyendo el subtítulo del hero y el meta
description; y `/promos` mostraba doce tarjetas, ocho de ellas en gris con el
cartel "no disponible". Todo eso sobrevivió a varios cambios de fórmula
porque **nada rompe cuando un texto queda mentiroso** — no hay error de
compilación, no hay test que falle.

La regla: **si una página nombra un acabado, un gramaje o un proceso, tiene
que sacarlo de los precios.** Si la página es un server component y no puede
leer el hook —el caso de `/nosotros`— entonces no nombra ninguno y enlaza a
`/acabados`.

Los pausados y el descontinuado **ya no aparecen en la portada ni en
`/promos`**. La única página que los menciona es `/acabados`, que para eso
está: ahí los pausados se anuncian como "vuelven pronto" y el descontinuado
ni se nombra.

Al filtrar quedó un detalle que conviene recordar: `promos.length` decide las
columnas del grid, y **las clases de Tailwind tienen que ser literales**.
`"lg:grid-cols-" + n` compila pero no genera CSS.

---

## 6. Lógica de negocio que no es obvia

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

Las cartas custom **sí suman** para las promos, como cualquier otra carta: el
papel, la tinta, el laminado y la hoja son los mismos, y la promo existe porque
el costo por carta baja con el volumen. Antes quedaban fuera, y eso hacía que un
mazo commander entero custom costara **más del doble** que el mismo mazo normal
($23.000 contra $10.400 en Básica) — fue justo el reclamo de un cliente que
quería muchas customs.

Lo único propio de una custom es preparar el archivo, y eso se cobra aparte:
**`custom_surcharge` es por diseño distinto, no por copia**. Pedir veinte copias
del mismo diseño es un solo trabajo de preparación y se cobra una sola vez,
aunque las pida repartidas en dos acabados.

Ojo con esto al tocar `/api/pedido`: el servidor cuenta los diseños por la
**imagen**, no por el `id` que manda el cliente. Con el id bastaría con
repetirlo en cien customs distintas para pagar un solo recargo.

### Dorso personalizado

Por defecto el reverso va blanco liso. El cliente puede subir una imagen desde
el carrito y se imprime al dorso de **todas** las cartas del pedido: se cobra
`dorso_diseno` una vez (preparar y calzar el archivo) más `dorso_carta` por cada
carta (la segunda pasada por la impresora).

Las **MDFC no pagan extra**: su reverso real ya viene con la carta y siempre se
imprimió así.

Por qué esto se puede hacer hoy aunque el "dorso real de Magic" siga en pausa:
son problemas distintos. El dorso oficial exige registro perfecto, porque todo
el mundo sabe cómo se ve y un milímetro de desviación salta. Un dorso custom no
tiene referencia contra la cual compararse, así que tolera mucha más
desalineación.

El costo tampoco está en el material: el 300g ya es doble faz, y la tinta de las
hojas extra de un mazo de 100 son ~$400. Está en la **impresora**, que es el
techo real de producción: un mazo entero con dorso son 12 hojas × 6 min de
máquina extra, contra la hoja suelta que hoy agregan las MDFC.

Los dos montos se editan en `/admin/precios` sin desplegar.

### Idioma de las cartas

**Se elige navegando, carta por carta, y viaja dentro del uid.** No se pregunta
en el checkout.

Antes sí se preguntaba ahí, y era **una promesa que nadie cumplía**: el pedido
guardaba la palabra ("Español"), el correo la repetía, el panel la mostraba, y
nada resolvía las cartas en ese idioma. Para Magic funcionaba solo si Seba se
acordaba de cambiar el "Card language" de Cardwright a mano. Para los otros
tres juegos era imposible: la imagen queda fija al agregar al carrito, así que
ningún paso posterior puede cambiarla.

Hoy el checkout **muestra** lo que trae el carrito en vez de preguntarlo, y un
pedido puede llevar cartas en más de un idioma si el cliente lo armó así.

Cada catálogo declara en `idiomas` lo que su fuente entrega **de verdad**,
medido contra la API y no copiado de su documentación:

| | Inglés | Español | Portugués | Japonés | Alemán | Francés | Italiano |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Magic | sí | sí | sí | sí | sí | sí | sí |
| Pokémon | sí | sí | sí | **no** | sí | sí | sí |
| Yu-Gi-Oh | sí | **no** | sí | **no** | sí | sí | sí |
| Mitos y Leyendas | no | **solo español** | no | no | no | no | no |
| Riftbound | sí | no | no | no | no | no | no |

Yu-Gi-Oh no tiene español y su propia API lo enumera en el mensaje de error
("accepts: 'fr', 'de', 'it' or 'pt'"). Pokémon no tiene japonés: la ruta
responde 404, no devuelve la carta en inglés. Ofrecer un idioma que después no
se puede imprimir se paga en el despacho, no en la búsqueda — por eso el
selector solo muestra lo que el juego sirve.

El respaldo es **el primer idioma que sirve ESE catálogo**, no el inglés
global: Mitos y Leyendas solo publica español, y caer al inglés ahí sería
pedirle algo que no existe.

Cuando la carta no existe en el idioma pedido, se entrega en inglés **y la
carta dice que vino en inglés**. El cliente ve lo que va a recibir, no una
etiqueta.

Un detalle de Magic que no es obvio: Scryfall guarda siempre el nombre inglés
en `name` y el traducido en `printed_name`. Sin eso, elegir español mostraba
"Arc Lightning" en vez de "Relámpago arco". Y **se filtran las impresiones con
`image_status` placeholder o missing**: no son la carta, son un cartel que dice
"Localized Image Not Available". En una búsqueda en español eran 11 de 39.

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

## 7. Trampas conocidas

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

**Verificar en local NO alcanza para un catálogo.** Es la trampa que costó un
despliegue roto en septiembre de 2026: Riftbound andaba impecable en desarrollo
y en producción salía vacío. Dos motivos que local nunca reproduce:

- **La IP es distinta.** Tu conexión de casa pasa filtros que los servidores de
  Vercel no (ver Riftcodex más arriba).
- **La API está tibia.** Después de una tarde probando, la API de turno
  responde al instante; producción la toca una vez cada mucho y siempre fría.

Para cualquier fuente nueva, la prueba que vale es contra `volcanproxies.cl`
después de desplegar, no `localhost`.

**Un catálogo caído devuelve el motivo.** `/api/catalogo` responde 502 con un
campo `motivo` que dice qué pasó ("Riftcodex 403", un plazo vencido, la API
caída). Antes decía solo "El catálogo no respondió" y con eso las tres causas
eran indistinguibles: hubo que adivinar. Si algo falla en producción, eso es lo
primero que hay que mirar.

**Ningún fetch a un catálogo va sin plazo.** `lib/catalogo/http.ts` les pone 8
segundos. Una API que deja de responder sin cerrar la conexión — le pasó a
TCGdex — cuelga la función de Vercel hasta que la corten. Ojo también con
encadenar dos llamadas seguidas: son dos plazos, y el límite de la función es
de 10 segundos.

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

## 8. Modelo de costos

Todo se calcula por **hoja A4 = 8 cartas**, y las hojas se **redondean hacia
arriba**: 100 cartas ocupan 13 hojas, no 12,5.

**Ocho, no nueve.** Se imprime en **4×2** porque con 3×3 no quedan márgenes
para las marcas de registro del corte. En el código son dos constantes
separadas — `CARTAS_POR_HOJA` y `MIN_CARDS` — aunque hoy valgan lo mismo:
estaban unidas y el panel de stock calculaba las hojas dividiendo por el
mínimo de compra, así que mover uno habría movido el otro en silencio.

Insumos con flete a Pucón (+18% estimado, ajustable):

| Insumo | Costo | Por hoja con flete |
|---|---|---|
| Papel 300g semibrillante | $3.900 / 50 | $92,0 |
| Papel 260g semibrillante | $5.790 / 50 | $136,6 |
| Papel 200g semibrillo | $4.700 / 50 | $110,9 |
| Adhesivo mate 130g | $5.990 / 50 | $141,4 |
| Laminado en frío | $8.990 / 50 | $212,2 |
| Tinta Epson T544 | $8.490 / ~300 | $33,4 |
| Pouch termolaminar | $12.970 / 100 | sin uso: ninguna lleva laminado en caliente |

Y lo que cuesta cada acabado:

| Acabado | Receta | Material/hoja | Material/carta |
|---|---|---|---|
| Básica | 300g + tinta | $125,4 | **$15,7** |
| Reforzada | 260g + adhesivo + tinta | $311,4 | **$38,9** |
| Premium | 200g + adhesivo + frío + tinta | $497,8 | **$62,2** |

### La métrica es la ganancia por hora, no el margen por carta

Porque el cuello de botella es el tiempo de Seba. Fue lo que reveló que el
antiguo Matte Premium, pese a tener el mayor margen por carta, era el producto
**menos** rentable por hora.

**Los tiempos reales de Seba, para un pedido de 100 cartas** (13 hojas, de
punta a punta, no solo impresión):

| Acabado | Tiempo | Margen | **Por hora** |
|---|---|---|---|
| Básica $130 | 0,5 h | $8.769 | $17.539 |
| Reforzada $250 | 1,0 h | $15.852 | $15.852 |
| Premium $400 | 1,5 h | $25.428 | $16.952 |

**Entre el mejor y el peor hay 11%.** La escalera está bien calibrada: los tres
pagan el tiempo casi igual, así que el cliente elige por lo que quiere y no hay
un acabado que convenga empujar. Revisado en septiembre de 2026; **no hay nada
que ajustar**, ni en los precios ni en las promos.

### Tres cosas que este modelo aprendió a la mala

**Los tiempos los pone Seba, no se estiman.** En la revisión de septiembre se
llegó a tres conclusiones seguidas —"las promos rinden 26% menos", "el Premium
rinde 48% más", "hay que subir la Reforzada a $300"— y **las tres estaban mal**
porque se apoyaban en tiempos inventados. Los costos de material se calculan;
los tiempos se preguntan.

**Cada pedido tiene un costo fijo de tiempo** que no depende del tamaño:
atender, revisar el pago, empaquetar, etiqueta, despacho. Contarlo cambia el
signo de las conclusiones sobre las promos — con solo 5 minutos de trámite, un
commander de 100 rinde el doble que un pedido de 8 cartas sueltas. **Las promos
no son un regalo: son lo que amortiza ese trámite.** El pedido chico es el que
sale caro.

**El rechazo del film importa menos que el tiempo.** Aplicar el laminado en
frío es minucioso y si sale mal se pierde la hoja entera. Aun así, perder el
20% de las hojas solo baja el Premium de $16.952 a $15.873 por hora. Un cuarto
de hora más de trabajo pega más fuerte que arruinar una de cada cinco hojas.

Hay una calculadora interactiva publicada como artifact:
https://claude.ai/code/artifact/91c5b420-5d80-4d0b-bf90-191b7e357612

---

## 9. Panel de administración

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
- **Importar a Cardwright:** hay tres vías. La **lista de cartas** (`.json`)
  trae el pedido entero de una vez y sirve para cualquier juego — es la única
  para Pokémon, Yu-Gi-Oh, Riftbound y las customs, porque el decklist es
  Magic-only. Las cartas con arte MPCFill salen además como XML de orden
  (formato mpc-autofill, con el Drive id de cada diseño) y las de Scryfall como
  decklist MTGO. Todas caen en la misma cola.

  La lista **resuelve la imagen de impresión**: lo que guarda el pedido es la
  miniatura que vio el cliente, y mandar eso a imprimir sale borroso. Si alguna
  no se puede resolver, el panel dice cuál.

  Del lado de Cardwright, el botón es **Import → "Card list…"**, y el formato
  está documentado en su `cardlist.py`. Ojo: **el `.exe` publicado puede no
  tenerlo**; para probarlo hay que correr Cardwright desde el código.

- **Aviso de tamaños mezclados:** un pedido con Magic y Yu-Gi-Oh son dos tandas
  de impresión, porque Cardwright imprime con el tamaño de carta que tenga
  seleccionado y no avisa.

- **Bloque de otros juegos:** lista las cartas que no son de Magic con su
  número de arte, para cuando se cargan a mano.
- **Editar envío**, bloqueado si ya hay tracking, y con registro del cambio en
  las notas internas.
- **Archivar**, que saca el pedido del panel sin borrarlo y deja de reservar
  material y de agrupar envíos.

**Cardwright** es la app de escritorio de Seba para imprimir (vive en
`C:/Users/smyo9/upscaler`). El XML y la decklist que genera el panel están
hechos a la medida de sus parsers reales.

---

## 10. Cómo trabajar con Seba

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

## 11. Pendientes

- **Resincronizar Riftbound cuando salga un set**: `node scripts/sync-riftbound.mjs`
  desde la máquina de Seba. Es lo único del catálogo que no se actualiza solo.
- **Los pedidos con varios juegos son varias tandas de impresión** si mezclan
  tamaños de carta. El panel avisa, pero el flujo de producción para eso no
  está pensado todavía.
- **El autocompletado de Magic sigue en inglés.** Scryfall no acepta idioma en
  ese endpoint (`include_multilingual` devuelve vacío, está medido). La
  búsqueda sí entiende el nombre traducido, así que solo la sugerencia del
  navbar queda en inglés.
- **Más juegos**: la llave de API TCG ya está puesta, así que sumar otro es
  copiar `lib/catalogo/myl.ts` y cambiar el slug. Por calidad de imagen valen
  **One Piece** y **Gundam**; **Vanguard** sale blando y **Digimon no sirve**.
  Los números están en la sección de catálogos.
- **Fotos de los acabados**: subir `base300.jpg` y `reforzada300.jpg` a
  `public/acabados/`. La comparativa en `/acabados` aparece sola cuando los
  archivos existen (los detecta el navegador, no hay que tocar código).
- **Cargar el stock inicial** en `/admin/stock`; hasta entonces la columna
  "Queda" no significa nada.
- **Cuánto dura el trámite de un pedido** (atender, empaquetar, despachar): es
  el único número del modelo de costos que sigue siendo una estimación, y es el
  que diría si el mínimo de 8 cartas se sostiene.
- **Cartas con dorso real** (el reverso oficial de Magic): en pausa hasta tener
  mejor impresora. Precio calculado $900/carta, con el costo dominado por el
  rechazo al pegar los dos papeles. Si se retoma, hay que rehacer los números.
  No confundir con el **dorso personalizado**, que ya está en producción y es
  otra cosa: no necesita registro perfecto porque el cliente no tiene con qué
  compararlo.
- **Calibrar el precio del dorso en pedidos chicos**: con $1.500 por diseño, un
  pedido de 9 cartas paga $207 por carta de dorso, contra $55 en uno de 100. Es
  correcto (el trabajo es el mismo), pero puede espantar a quien quiere probar.
  Si pasa, se baja `dorso_diseno` desde el panel.
- **Cablear `config.banco`** para no tener los datos de transferencia
  hardcodeados.
- **Activar el Premium** en `/admin/precios` cuando Seba lo decida. El precio
  de $400 está justificado con los costos reales; nace apagado para que no se
  venda antes de esa decisión.
- **Cargar los materiales nuevos** en `/admin/stock`: papel 260g, papel 200g y
  adhesivo mate 130g.
