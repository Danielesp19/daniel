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
| Números autorizados para administrar | `CHATBOT_ADMINS` |
| Productos, precios y fotos reales | Por WhatsApp — el seeder trae datos de ejemplo |
| Texto de la portada | Por WhatsApp |

> **Los teléfonos son provisionales.** Todo apunta a `573222248487`, un número
> de pruebas, mientras se consigue la línea de WhatsApp Business. Hay que
> cambiarlo en `marca.ts` (o vía `NEXT_PUBLIC_WHATSAPP`) y en `CHATBOT_ADMINS`.

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
| "cambia el título de la portada" | Edita los textos del hero |
| "crea una sección de suscripciones" | Crea la categoría y elige cómo se muestra |

**Agotado y oculto no son lo mismo**, y el bot está entrenado para no
confundirlos: lo primero deja el producto visible con su sello, lo segundo lo
borra de la página. Si el mensaje es ambiguo, pregunta.

Las **fotos** son la pieza que hace que esto sustituya al panel de verdad: es
lo único que no se puede hacer escribiendo. Cuando llega una imagen, se baja de
Meta, se reduce y se pasa a WebP, y queda en espera hasta que digas de qué
producto es — puede ser en el mismo mensaje o en el siguiente.

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
php artisan queue:work --tries=2
```

Configuración en `.env` (ver `api/.env.example` para el detalle):
`CHATBOT_ADMINS`, `CHATBOT_VERIFY_TOKEN`, `CHATBOT_APP_SECRET`,
`CHATBOT_PHONE_ID`, `CHATBOT_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`.

> **`CHATBOT_ADMINS` y `CHATBOT_APP_SECRET` no son opcionales en producción.**
> La lista blanca es lo único que separa un mensaje de WhatsApp de la base de
> datos, y sin el secreto el webhook queda abierto a internet — por eso en
> producción se rechazan todas las peticiones si falta.

## Pruebas

```bash
cd api && php artisan test          # 42 pruebas
cd web && npx tsc --noEmit && npx eslint src
```

Las pruebas cubren lo que duele si se rompe: el ajuste de stock (donde está la
plata), la separación entre productos y servicios, y la seguridad del webhook
(firma, lista blanca, deduplicación).

## Despliegue

Ver [DESPLIEGUE.md](DESPLIEGUE.md).
