# Daniel Buitrón · Barista — sitio y catálogo

Sitio de un barista profesional colombiano que vende café de especialidad y
presta servicios: asesoría para barras, clases de arte latte y barra para
eventos. Los pedidos salen por WhatsApp y el catálogo se administra desde un
panel propio.

```
.
├── api/    # Laravel 13 — catálogo, inventario y panel admin
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
- **Tres formas de mostrar una categoría**, que se eligen en el panel: grilla de
  tarjetas, vitrina vertical (filas alternadas sobre foto fija) y vitrina de a
  uno (se pasa deslizando, pensada para los videos de métodos).
- **Productos y servicios conviven.** Un café se cuenta en bolsas y se agota;
  una asesoría se agenda y nunca se agota. Lo distingue la bandera
  `controla_stock`, y de ahí en adelante todo se comporta distinto: el botón
  dice "Agendar" en vez de "Agregar", no aparece en los reportes de inventario
  y no se le puede ajustar stock.
- **Carrito que va a WhatsApp.** No hay pasarela de pago: se arma el mensaje
  con el pedido y se abre el chat. Antes de abrirlo se revalida contra el
  servidor qué sigue disponible, porque el catálogo se sirve cacheado.
- **El inventario no se publica.** El cliente ve en qué sedes se consigue un
  producto, con dirección y horario, pero nunca cuántas unidades hay. Eso vive
  en el panel. Ver [El panel de administración](#el-panel-de-administración).

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

El panel queda en `http://localhost:3000/admin`, con la contraseña de
`ADMIN_PASSWORD` en `web/.env.local`.

## Qué falta poner antes de publicar

Los datos del negocio están centralizados; no hay que buscarlos por el código.

| Qué | Dónde |
|---|---|
| Nombre, logros, redes | `web/src/lib/marca.ts` |
| Número de WhatsApp de pedidos | `NEXT_PUBLIC_WHATSAPP` |
| Contraseña del panel | `ADMIN_PASSWORD` (en el `.env` del sitio) |
| Productos, precios y fotos reales | Desde el panel — el seeder trae datos de ejemplo |

> **Los teléfonos son provisionales.** Todo apunta a `573222248487`, un número
> de pruebas, mientras se consigue la línea de WhatsApp Business. Hay que
> cambiarlo en `marca.ts` (o vía `NEXT_PUBLIC_WHATSAPP`).

> El palmarés en `marca.ts` tiene **tres** logros (Nacional Arte Latte 2025 y
> 2024, Reto 4V 2024). En el Instagram hay un cuarto que empieza por "Ranci…"
> y no se alcanzó a leer completo — agrégalo cuando lo confirmes.

## Cómo está organizado

### Backend (`api/`)

| Ruta | Para qué |
|---|---|
| `GET /api/catalogo` | Catálogo completo. Cacheado 60 s en el CDN. |
| `GET /api/catalogo/stock` | Qué sigue disponible (sí/no), sin caché. Lo usa el carrito antes de enviar. |
| `GET /api/catalogo/sedes` | Los puntos de venta con su dirección y horario. |
| `PATCH /api/admin/productos/{id}/stock` | Movimiento de inventario. Token Bearer. |

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
  tiene que decir cuál de las dos entendió. Vive en `Producto::ajustarStockSede()`.

### Frontend (`web/`)

El sistema de diseño está en `src/app/globals.css`: negro y blanco puros,
bordes duros sin radios, condensada en mayúsculas para los titulares,
monoespaciada para todo dato medible, y un solo acento verde reservado para
señalar.

Dos piezas cargan con más historia de la que aparentan y tienen el porqué
escrito al lado:

- `src/hooks/useRevelar.ts` — un solo IntersectionObserver para toda la
  página, con cola para que los elementos no aparezcan todos en bloque.
- `src/components/catalogo/FondoBotanico.tsx` — las ramas de la portada. La
  ilustración va como máscara CSS y no como imagen: pesa seis veces menos y
  el color se decide desde la hoja de estilos.

## El panel de administración

Vive en `/admin` y es la única forma de administrar el sitio: catálogo,
secciones, productos y kits, recetas, preguntas frecuentes, sedes, el aviso de
la portada y el buzón de preguntas.

Entra con una contraseña compartida —no hay usuarios ni roles: lo usa una
persona— que se cambia por el token del backend en `/api/admin-auth`. La
contraseña nunca sale del servidor de Next y el token del backend nunca viaja
en el bundle.

Los productos se despliegan con un clic para ver su ficha, las notas de cata,
el inventario por sede y los archivos sin abrir el formulario. **El inventario
solo se ve acá**: el catálogo público muestra en qué sedes se consigue un
producto, con su dirección y su horario, pero nunca cuántas unidades hay.

> Hubo un chatbot de WhatsApp que administraba el catálogo por chat. Se
> descartó. Si alguna vez hace falta, está en el historial de git —los cuatro
> commits del 22 de septiembre de 2026— junto con su webhook, su cola de
> fotos y su medidor de gasto.

## Pruebas

```bash
cd api && php artisan test          # 89 pruebas
cd web && npx tsc --noEmit && npx eslint src
```

Las pruebas cubren lo que duele si se rompe: el ajuste de stock (donde está la
plata), la separación entre productos y servicios, que borrar algo avise antes
de llevarse por delante lo que lo usa, y que el inventario no se escape al
catálogo público.

## Despliegue

Ver [DESPLIEGUE.md](DESPLIEGUE.md).
