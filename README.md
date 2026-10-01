Sitio web y catálogo para un barista colombiano. El proyecto permite mostrar su trabajo, vender café de especialidad y ofrecer servicios como asesorías, clases de arte latte y barras para eventos.

Los pedidos se realizan por WhatsApp y el catálogo se administra desde un panel privado.

Estructura
.
├── api/    # Backend con Laravel
└── web/    # Frontend con Next.js
¿Qué tiene el proyecto?

La página está pensada para presentar primero al barista y su trabajo, y después mostrar el catálogo.

Entre las principales funciones están:

Página de presentación y trayectoria.
Catálogo de cafés de especialidad.
Fichas con información del café: región, altura, variedad, proceso y puntaje.
Diferentes formas de mostrar los productos dentro de una categoría.
Servicios como asesorías, clases y barras para eventos.
Carrito que genera el pedido y lo envía por WhatsApp.
Manejo de inventario por sede.
Información de las sedes, horarios y direcciones.
Panel privado para administrar el contenido.

Los servicios funcionan de forma diferente a los productos físicos. Por ejemplo, una bolsa de café puede tener existencias, mientras que una asesoría se agenda y no necesita control de inventario.

Instalación
Requisitos
PHP 8.3 o superior
Composer
Node.js 20 o superior
Base de datos compatible con Laravel
FFmpeg (opcional, para trabajar con videos)
Backend
cd api

composer install

cp .env.example .env

php artisan key:generate

php artisan migrate --seed

php artisan storage:link

php artisan serve --port=8001

El backend quedará disponible en:

http://localhost:8001
Frontend

En otra terminal:

cd web

npm install

npm run dev

El sitio estará disponible en:

http://localhost:3000

El panel administrativo se encuentra en:

http://localhost:3000/admin

La configuración del acceso administrativo debe hacerse mediante las variables de entorno correspondientes. No se deben subir contraseñas, tokens ni archivos .env al repositorio.

Backend

Algunas de las rutas principales son:

Método	Ruta	Descripción
GET	/api/catalogo	Obtiene el catálogo
GET	/api/catalogo/stock	Consulta disponibilidad de productos
GET	/api/catalogo/sedes	Obtiene las sedes disponibles
PATCH	/api/admin/productos/{id}/stock	Actualiza el inventario
Algunas reglas del proyecto

Los precios se manejan como valores enteros en pesos colombianos. Por ejemplo:

48000

y no:

48000.00

El inventario se maneja por unidades disponibles y está separado de la información pública del catálogo.

Un producto puede estar:

Activo y disponible.
Activo pero agotado.
Inactivo.

Un producto agotado puede seguir apareciendo en el catálogo, pero no puede agregarse a un pedido.

Los servicios no utilizan inventario. Esto permite que una asesoría o una clase tenga el mismo sistema de catálogo sin tratarla como si fuera un producto físico.

Los movimientos de inventario indican explícitamente qué operación se quiere realizar:

fijar
sumar
restar

Esto evita confundir, por ejemplo, “llegaron 10 unidades” con “ahora quedan 10 unidades”.

Frontend

El frontend está desarrollado con Next.js.

Los estilos generales se encuentran en:

web/src/app/globals.css

El diseño utiliza principalmente blanco y negro, bordes rectos y tipografías diferentes para títulos y datos técnicos.

Algunos componentes importantes son:

web/src/hooks/useRevelar.ts
web/src/components/catalogo/FondoBotanico.tsx

useRevelar se utiliza para las animaciones de entrada de los elementos mientras se hace scroll.

FondoBotanico contiene el recurso gráfico utilizado en algunas partes de la página principal.

Panel administrativo

El panel está disponible en:

/admin

Desde allí se puede administrar:

Productos.
Categorías.
Kits.
Recetas.
Preguntas frecuentes.
Sedes.
Contenido de la página principal.
Preguntas recibidas.
Inventario.

El inventario es información interna. Los usuarios solamente pueden consultar en qué sedes está disponible un producto, junto con la información de la sede.

Las credenciales y tokens utilizados por el panel se manejan mediante variables de entorno y no deben incluirse directamente en el código fuente.

WhatsApp

El proyecto no utiliza una pasarela de pagos.

El usuario agrega los productos al carrito y, al finalizar, se genera un mensaje con el pedido que posteriormente se abre en WhatsApp.

Antes de generar el pedido se vuelve a consultar la disponibilidad de los productos para evitar que se realice un pedido de algo que se agotó mientras el catálogo estaba cargado.

Pruebas

Para ejecutar las pruebas del backend:

cd api
php artisan test

Para revisar el frontend:

cd web
npx tsc --noEmit
npx eslint src

Las pruebas cubren principalmente el manejo del inventario, productos y servicios, eliminación de registros y separación entre la información pública y administrativa.

Despliegue

La información relacionada con el despliegue se encuentra en:

DESPLIEGUE.md

Los datos sensibles, contraseñas, tokens, claves de API y variables de entorno deben mantenerse fuera del repositorio.
