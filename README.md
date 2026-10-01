# Daniel Buitrón · Barista

Sitio web y catálogo para un barista profesional colombiano que vende café de especialidad y ofrece servicios como asesorías para barras, clases de arte latte y barras para eventos.

Los pedidos se realizan por WhatsApp y el catálogo se administra desde un panel propio.

## Estructura del proyecto

```text
.
├── api/    # Laravel — catálogo, inventario y administración
└── web/    # Next.js — sitio público
```

## La idea

El sitio está pensado para presentar primero al barista y su trabajo, y después mostrar el catálogo. La idea es que el usuario conozca quién está detrás del café antes de llegar a los productos.

### Catálogo

Los cafés cuentan con información técnica como:

* Región
* Altura
* Variedad
* Proceso
* Puntaje SCA
* Notas de cata
* Precio
* Disponibilidad por sede

Las categorías pueden mostrarse de diferentes formas desde el panel de administración:

* Grilla de tarjetas
* Vitrina vertical
* Vitrina individual

### Productos y servicios

El catálogo permite manejar productos físicos y servicios.

Los productos físicos tienen control de inventario, mientras que los servicios no necesitan stock.

Esto se controla mediante el campo `controla_stock`.

Cuando `controla_stock` está desactivado, el elemento se trata como un servicio.

### Pedidos por WhatsApp

No se utiliza una pasarela de pago.

El usuario agrega los productos al carrito y al finalizar se genera un mensaje con el pedido que se abre directamente en WhatsApp.

Antes de enviar el pedido se vuelve a consultar la disponibilidad en el servidor para evitar pedidos de productos que se hayan agotado mientras el catálogo estaba abierto.

### Inventario

El inventario es información interna.

El usuario puede consultar en qué sedes está disponible un producto, junto con la dirección y el horario, pero no puede ver la cantidad exacta de unidades.

## Tecnologías

### Backend

* PHP 8.3+
* Laravel
* Composer
* API REST
* SQLite / base de datos configurada en `.env`

### Frontend

* Next.js
* React
* TypeScript
* CSS

### Otros

* WhatsApp para los pedidos
* FFmpeg para el procesamiento de videos

## Instalación

### Requisitos

Antes de comenzar es necesario tener instalado:

* PHP 8.3 o superior
* Composer
* Node.js 20 o superior
* NPM
* Una base de datos compatible con Laravel

FFmpeg es opcional y se utiliza para algunas funciones relacionadas con videos.

## Backend

Entrar a la carpeta del backend:

```bash
cd api
```

Instalar las dependencias:

```bash
composer install
```

Crear el archivo `.env`:

```bash
cp .env.example .env
```

Generar la clave de Laravel:

```bash
php artisan key:generate
```

Ejecutar las migraciones y cargar los datos iniciales:

```bash
php artisan migrate --seed
```

Crear el enlace de almacenamiento:

```bash
php artisan storage:link
```

Iniciar el servidor:

```bash
php artisan serve --port=8001
```

El backend quedará disponible en:

`http://localhost:8001`

## Frontend

En otra terminal:

```bash
cd web
```

Instalar las dependencias:

```bash
npm install
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

El frontend estará disponible en:

`http://localhost:3000`

## Panel de administración

El panel se encuentra en:

`http://localhost:3000/admin`

Desde el panel se pueden administrar:

* Productos
* Categorías
* Kits
* Recetas
* Preguntas frecuentes
* Sedes
* Contenido de la página principal
* Preguntas recibidas
* Inventario

El acceso administrativo se configura mediante variables de entorno.

Las contraseñas y tokens no deben escribirse directamente en el código ni subirse al repositorio.

## API

Algunas de las rutas principales son:

| Método  | Endpoint                          | Descripción                                 |
| ------- | --------------------------------- | ------------------------------------------- |
| `GET`   | `/api/catalogo`                   | Obtiene el catálogo                         |
| `GET`   | `/api/catalogo/stock`             | Consulta la disponibilidad de los productos |
| `GET`   | `/api/catalogo/sedes`             | Obtiene las sedes                           |
| `PATCH` | `/api/admin/productos/{id}/stock` | Actualiza el inventario                     |

## Reglas del inventario

El inventario se maneja por unidades disponibles.

Un producto puede encontrarse en diferentes estados:

* **Activo y disponible:** se muestra y puede pedirse.
* **Activo pero agotado:** se muestra, pero no puede agregarse al pedido.
* **Inactivo:** no se muestra en el catálogo.

Los servicios no utilizan inventario.

Los movimientos de stock utilizan tres acciones:

```text
fijar
sumar
restar
```

Por ejemplo:

```text
sumar 10
```

agrega 10 unidades al inventario.

Mientras que:

```text
fijar 10
```

establece directamente el inventario en 10 unidades.

## Precios

Los precios se manejan como valores enteros en pesos colombianos.

Por ejemplo:

```text
48000
```

en lugar de:

```text
48000.00
```

De esta forma no se utilizan valores decimales para manejar los precios.

## Frontend

Los estilos generales del proyecto se encuentran en:

```text
web/src/app/globals.css
```

Algunos archivos importantes son:

```text
web/src/hooks/useRevelar.ts
web/src/components/catalogo/FondoBotanico.tsx
```

`useRevelar` se utiliza para las animaciones de aparición de los elementos durante el scroll.

`FondoBotanico` contiene uno de los elementos gráficos utilizados en la página principal.

## Pruebas

Para ejecutar las pruebas del backend:

```bash
cd api
php artisan test
```

Para comprobar el código del frontend:

```bash
cd web
npx tsc --noEmit
npx eslint src
```

Las pruebas cubren principalmente:

* Manejo del inventario.
* Productos y servicios.
* Disponibilidad de productos.
* Eliminación de registros.
* Información pública del catálogo.
* Separación entre datos públicos y administrativos.

## Variables de entorno

Las variables de entorno deben configurarse de forma local.

No se deben subir al repositorio archivos como:

```text
.env
.env.local
```

Tampoco se deben incluir directamente en el código:

* Contraseñas
* Tokens
* Claves de API
* Credenciales de bases de datos
* Secretos del servidor

Los archivos `.env.example` sirven como referencia para configurar las variables necesarias.

## Despliegue

La información relacionada con el despliegue se encuentra en:

[DESPLIEGUE.md](DESPLIEGUE.md)

Antes de realizar un despliegue se deben configurar las variables de entorno correspondientes al servidor.

## Notas

El catálogo público y el panel administrativo están separados. La información de inventario y administración no se expone en el catálogo público.

El proyecto está pensado para poder ampliar posteriormente el catálogo, agregar nuevos servicios y manejar más sedes sin cambiar la estructura principal.
