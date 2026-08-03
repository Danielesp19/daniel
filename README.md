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
- **Tres formas de mostrar una categoría**, configurables desde el panel:
  grilla de tarjetas, vitrina vertical (filas alternadas sobre foto fija) y
  vitrina de a uno (se pasa deslizando, pensada para los videos de métodos).
- **Productos y servicios conviven.** Un café se cuenta en bolsas y se agota;
  una asesoría se agenda y nunca se agota. Lo distingue la bandera
  `controla_stock`, y de ahí en adelante todo se comporta distinto: el botón
  dice "Agendar" en vez de "Agregar", no aparece en los reportes de inventario
  y el chatbot se niega a ajustarle stock.
- **Carrito que va a WhatsApp.** No hay pasarela de pago: se arma el mensaje
  con el pedido y se abre el chat. Antes de abrirlo se revalida el stock contra
  el servidor, porque el catálogo se sirve cacheado.
- **Inventario por chat.** Le escribes al bot de WhatsApp ("¿cuánto queda del
  bourbon rosado?", "llegaron 12 bolsas") y él consulta o ajusta.

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
| Nombre, logros, redes, teléfonos | `web/src/lib/marca.ts` |
| Número de WhatsApp de pedidos | `NEXT_PUBLIC_WHATSAPP` (o el valor por defecto en `marca.ts`) |
| Productos, precios y fotos reales | Panel en `/admin` — el seeder trae datos de ejemplo |
| Texto de la portada | Panel → Portada |

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

## El chatbot de inventario

Le escribes por WhatsApp y Claude interpreta el mensaje, consulta el catálogo
con herramientas y responde. Puede buscar productos, dar un resumen del
inventario, ajustar stock y editar datos de un producto.

El flujo es: Meta llama al webhook → se valida la firma HMAC del cuerpo crudo
→ se revisa que el número esté en la lista blanca → se descarta si el mensaje
ya se procesó → se encola. El trabajo real ocurre en la cola porque WhatsApp
espera un 200 en segundos y una vuelta del modelo con herramientas tarda más.

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
cd api && php artisan test          # 24 pruebas
cd web && npx tsc --noEmit && npx eslint src
```

Las pruebas cubren lo que duele si se rompe: el ajuste de stock (donde está la
plata), la separación entre productos y servicios, y la seguridad del webhook
(firma, lista blanca, deduplicación).

## Despliegue

Ver [DESPLIEGUE.md](DESPLIEGUE.md).
