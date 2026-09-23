# Daniel Buitrón · Barista — sitio y catálogo

Sitio de un barista profesional colombiano que vende café de especialidad y
presta servicios: asesoría para barras, clases de arte latte y barra para
eventos. Los pedidos salen por WhatsApp y el inventario se administra por chat.

```
.
├── api/    # Laravel 13 — catálogo, inventario, panel admin y chatbot
└── web/    # Next.js 16 — el sitio público
```

## La idea

El sitio no vende un café anónimo: vende el criterio de alguien con nombre y
con resultados. Por eso el orden es **portada → quién está detrás → catálogo**,
y no al revés. Quien llega decide si confía en el barista antes de mirar
precios, así que la sección de presentación lleva el palmarés como tabla de
datos —año, competencia, puesto— en vez de una lista de adjetivos.

- **Catálogo con fichas técnicas.** Los datos duros del café son el diseño, no
  un adorno: región, altura, variedad, proceso y puntaje SCA van en una rejilla
  monoespaciada en cada tarjeta.
- **Tres formas de mostrar una categoría**, que se eligen por chat: grilla de
  tarjetas, vitrina vertical (filas alternadas sobre foto fija) y vitrina de a
  uno (se pasa deslizando, pensada para los videos de métodos).
- **Productos y servicios conviven.** Un café se cuenta en bolsas y se agota;
  una asesoría se agenda y nunca se agota. Lo distingue la bandera
  `controla_stock`, y de ahí en adelante todo se comporta distinto: el botón
  dice "Agendar" en vez de "Agregar", no aparece en los reportes de inventario
  y el chatbot se niega a ajustarle stock.
- **Carrito que va a WhatsApp.** No hay pasarela de pago: se arma el mensaje
  con el pedido y se abre el chat. Antes de abrirlo se revalida el stock contra
  el servidor, porque el catálogo se sirve cacheado.
- **La página se administra por WhatsApp.** No hay que abrir un panel: se le
  escribe al bot ("llegaron 12 bolsas", "el geisha se acabó", "cámbiale el
  precio") y hasta se le mandan las fotos de los productos. Ver
  [WhatsApp es el panel de administración](#whatsapp-es-el-panel-de-administración).

## Levantar el proyecto

Requisitos: PHP 8.3+, Composer, Node 20+. Opcional: `ffmpeg` para comprimir
los videos que se suban.

**Backend** (`http://localhost:8001`):

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed     # crea un catálogo de ejemplo
php artisan storage:link
php artisan serve --port=8001
```

**Frontend** (`http://localhost:3000`):

```bash
cd web
npm install
npm run dev
```

El panel de administración queda en `http://localhost:8001/admin`
(`admin@barista.co` / `password` — cámbiala antes de exponerlo).

## Qué falta poner antes de publicar

Los datos del negocio están centralizados; no hay que buscarlos por el código.

| Qué | Dónde |
|---|---|
| Nombre, logros, redes | `web/src/lib/marca.ts` |
| Número de WhatsApp de pedidos | `NEXT_PUBLIC_WHATSAPP` |
| Número de WhatsApp Business del bot | `CHATBOT_PHONE_ID` / `CHATBOT_ACCESS_TOKEN` |
| El número que administra (uno solo) | `CHATBOT_ADMIN` |
| Tope de gasto mensual del bot | `CHATBOT_TOPE_MENSUAL_USD_CENTAVOS` |
| Productos, precios y fotos reales | Por WhatsApp — el seeder trae datos de ejemplo |
| Texto de la portada | Por WhatsApp |

> **Los teléfonos son provisionales.** Todo apunta a `573222248487`, un número
> de pruebas, mientras se consigue la línea de WhatsApp Business. Hay que
> cambiarlo en `marca.ts` (o vía `NEXT_PUBLIC_WHATSAPP`) y en `CHATBOT_ADMIN`.

> El palmarés en `marca.ts` tiene **tres** logros (Nacional Arte Latte 2025 y
> 2024, Reto 4V 2024). En el Instagram hay un cuarto que empieza por "Ranci…"
> y no se alcanzó a leer completo — agrégalo cuando lo confirmes.

## Cómo está organizado

### Backend (`api/`)

| Ruta | Para qué |
|---|---|
| `GET /api/catalogo` | Catálogo completo. Cacheado 60 s en el CDN. |
| `GET /api/catalogo/stock` | Stock en vivo, sin caché. Lo usa el carrito antes de enviar. |
| `GET /api/catalogo/hero` | Contenido de la portada. |
| `PATCH /api/admin/productos/{id}/stock` | Movimiento de inventario. Token Bearer. |
| `POST /api/chatbot/webhook` | Entrada de WhatsApp. Firma HMAC + lista blanca. |

Reglas del dominio que conviene conocer antes de tocar nada:

- **La plata es entera.** `precio_cop` es un `BIGINT` en pesos: 48000, nunca
  48000.00. Ningún decimal flotante toca un precio.
- **El stock se cuenta en bolsas**, no en gramos: es como lo cuenta quien está
  parado frente al estante.
- **Agotado ≠ inactivo.** Un café sin stock se sigue mostrando con su sello de
  AGOTADO porque es parte del portafolio; solo no se puede pedir. Inactivo sí
  desaparece del catálogo.
- **`controla_stock = false` es un servicio.** No se cuenta, no se agota, no
  sale en los reportes de inventario y no se le puede ajustar stock por
  ninguna vía.
- **Los movimientos de stock piden la acción explícita** (`fijar`, `sumar`,
  `restar`). "Llegaron 12" y "quedan 12" son cosas distintas, y quien llame
  tiene que decir cuál de las dos entendió. Vive en `Producto::ajustarStock()`.

### Frontend (`web/`)

El sistema de diseño está en `src/app/globals.css`: negro y blanco puros,
bordes duros sin radios, condensada en mayúsculas para los titulares,
monoespaciada para todo dato medible, y un solo acento verde reservado para
señalar.

Dos piezas cargan con más historia de la que aparentan y tienen el porqué
escrito al lado:

- `src/hooks/useFondoPineado.ts` — deja una foto quieta durante toda una
  sección sin usar `position: sticky`, que se rompe dentro de un ancestro con
  overflow recortado.
- `src/hooks/useRevelar.ts` — un solo IntersectionObserver para toda la
  página, con cola para que los elementos no aparezcan todos en bloque.

## WhatsApp es el panel de administración

No es un extra: **es la única forma prevista de administrar el sitio.** La idea
es que quien atiende el negocio no abra nunca un navegador — le escribe al bot
desde el celular y el sitio cambia.

Le escribes y Claude interpreta el mensaje, usa las herramientas que necesite y
responde. Lo que puede hacer:

| Le dices | Hace |
|---|---|
| "¿cuánto queda del bourbon?" | Busca y responde con el stock |
| "llegaron 12 bolsas del mirador" | Suma 12 |
| "el geisha se acabó" | Lo deja en 0 → sale con el sello **AGOTADO**, pero sigue en la página |
| "quita el descafeinado de la página" | Lo oculta del catálogo (te lo confirma antes) |
| "súbele el precio a 52.000" | Cambia el precio (te lo confirma antes) |
| *(manda una foto)* "esta es la del mirador" | Le pone la foto al producto |
| "agrega un café nuevo, Tabi del Quindío a 74.000" | Crea el producto y te pide lo que falte |
| "arma un kit de V60 a 180.000, trae filtros y cuchara" | Crea el kit con sus piezas y te pide las fotos |
| "al kit métele también la prensa francesa" | Le engancha un producto del catálogo como componente |
| "crea una sección de suscripciones" | Crea la categoría y elige cómo se muestra |
| "¿cuánto llevo gastado este mes?" | Te dice el consumo del bot y cuánto queda de tope |

**Agotado y oculto no son lo mismo**, y el bot está entrenado para no
confundirlos: lo primero deja el producto visible con su sello, lo segundo lo
borra de la página. Si el mensaje es ambiguo, pregunta.

Las **fotos** son la pieza que hace que esto sustituya al panel de verdad: es
lo único que no se puede hacer escribiendo. Cuando llega una imagen, se baja de
Meta, se reduce y se pasa a WebP, y queda en espera hasta que digas de qué
producto es — puede ser en el mismo mensaje o en el siguiente.

Las fotos **hacen fila**: caben hasta ocho esperando, numeradas por orden de
llegada, que es como hay que mandarlas para armar un kit (una por pieza). Con
más de una en espera el bot nunca adivina cuál va dónde — pregunta. Es a
propósito: ponerle al café la foto del molino no se nota hasta que un cliente
abre la página.

Después de cada cambio el backend le avisa al sitio que se regenere, así que no
hay que esperar el minuto del caché para ver el resultado.

El flujo es: Meta llama al webhook → se valida la firma HMAC del cuerpo crudo
→ se revisa que el número esté en la lista blanca → se descarta si el mensaje
ya se procesó → se encola. El trabajo real ocurre en la cola porque WhatsApp
espera un 200 en segundos y una vuelta del modelo con herramientas tarda más.

> El panel de Filament en `/admin` sigue existiendo, pero como red de
> seguridad: para trabajo en lote o para destrabar algo que el bot no pueda.
> El camino normal es el chat.

Para que funcione hace falta un worker vivo:

```bash
php artisan queue:work
```

Un mensaje a la vez por número: mandar cuatro fotos seguidas son cuatro
trabajos, y si se procesaran al tiempo el último en guardar le borraría al
modelo el recuerdo de las otras tres.

Configuración en `.env` (ver `api/.env.example` para el detalle):
`CHATBOT_ADMIN`, `CHATBOT_VERIFY_TOKEN`, `CHATBOT_APP_SECRET`,
`CHATBOT_PHONE_ID`, `CHATBOT_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`.

> **`CHATBOT_ADMIN` y `CHATBOT_APP_SECRET` no son opcionales en producción.**
> Ese número es lo único que separa un mensaje de WhatsApp de la base de
> datos, y sin el secreto el webhook queda abierto a internet — por eso en
> producción se rechazan todas las peticiones si falta.

> **Administra UN solo número.** Es a propósito: con dos personas escribiéndole
> al mismo bot se pisan el hilo de la conversación —que es uno solo por
> número— y nadie sabe quién dejó el catálogo como quedó. Se escribe como
> venga (`+57 322 224 8487`, `573222248487`): se normaliza a dígitos antes de
> comparar. `CHATBOT_ADMINS`, la lista vieja, se sigue leyendo si `CHATBOT_ADMIN`
> está vacío, pero solo vale el primero.

### Cuánto cuesta esto al mes

WhatsApp no cobra por responder: las conversaciones que inicia el admin son
gratis, y el bot nunca escribe primero. **Lo único que cuesta es la API de
Claude**, que se paga por token consumido, sin mensualidad ni mínimo: una
semana sin escribirle no cuesta nada.

Con un uso de dos o tres cambios por semana son unos pocos dólares al mes. El
gasto no depende de cuántos productos cambies sino de cuántos mensajes se
crucen: preguntar tres veces "¿cómo vamos?" cuesta casi lo mismo que crear un
producto.

Dos cosas lo mantienen bajo control:

- **El prompt va cacheado.** Las instrucciones y las herramientas son
  idénticas en cada vuelta y son la mayor parte de lo que se paga; marcadas
  como caché, releerlas cuesta una décima parte.
- **El tope lo pone la aplicación, no la consola.** `CHATBOT_TOPE_MENSUAL_USD_CENTAVOS`
  (en centavos: `500` = US$5) corta de verdad — pasado el límite el bot avisa
  y responde sin llamar a la API. Al 80% manda un aviso, una sola vez. El
  admin puede preguntar "¿cuánto llevo gastado?" cuando quiera.

> **Si cambias `CHATBOT_MODELO`, cambia también `CHATBOT_PRECIO_ENTRADA` y
> `CHATBOT_PRECIO_SALIDA`.** El medidor no sabe qué modelo está corriendo: usa
> esos dos números para convertir tokens en plata, y si quedan desfasados el
> tope deja de valer. Los valores por millón de tokens están en el
> `.env.example`.

**Para que el negocio ponga su propia tarjeta:** que cree una cuenta en
`console.anthropic.com`, cargue saldo, active la recarga automática con su
límite de gasto y genere una API key. Esa key va en `ANTHROPIC_API_KEY` y el
consumo se le cobra a él directamente. Conviene dejar además el tope de la
aplicación en un valor cómodo: es el que avisa por WhatsApp antes de que la
tarjeta se entere.

## Pruebas

```bash
cd api && php artisan test          # 136 pruebas
cd web && npx tsc --noEmit && npx eslint src
```

Las pruebas cubren lo que duele si se rompe: el ajuste de stock (donde está la
plata), la separación entre productos y servicios, la seguridad del webhook
(firma, número reservado, deduplicación), el armado de kits por chat —incluido
que el bot pregunte en vez de adivinar cuando hay varias fotos esperando— y el
tope de gasto.

## Despliegue

Ver [DESPLIEGUE.md](DESPLIEGUE.md).
