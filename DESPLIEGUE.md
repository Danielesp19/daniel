# Despliegue

Dos piezas separadas: la API en un servidor con PHP y una base de datos, y el
sitio en Vercel. El sitio le pega a la API a través de su propio proxy, así
que el navegador nunca ve el dominio del backend.

## 1. La API (`api/`)

Sirve para cualquier hosting con PHP 8.3+. El repo trae un `Dockerfile` y un
`render.yaml` listos para Render, pero un VPS con nginx funciona igual.

### Variables obligatorias

```bash
APP_ENV=production
APP_DEBUG=false                      # nunca true: filtra trazas y secretos
APP_KEY=                             # php artisan key:generate
APP_URL=https://api.tudominio.co

DB_CONNECTION=pgsql                  # Render las inyecta solo
DB_HOST= DB_PORT= DB_DATABASE= DB_USERNAME= DB_PASSWORD=

# Token de la API de administración: largo y aleatorio.
#   php -r "echo bin2hex(random_bytes(32));"
ADMIN_TOKEN=

# Dominios del sitio, separados por coma y sin barra final.
CORS_ALLOWED_ORIGINS=https://tudominio.co

# URL del sitio y secreto para pedirle que se regenere después de cada cambio
# hecho por WhatsApp. El secreto debe ser el mismo que el de Vercel.
SITIO_URL=https://tudominio.co
REVALIDAR_SECRETO=

# La cola es obligatoria: el chatbot despacha su trabajo ahí.
QUEUE_CONNECTION=database
```

Y las del chatbot, si se va a usar (ver `api/.env.example`):
`CHATBOT_ADMINS`, `CHATBOT_VERIFY_TOKEN`, `CHATBOT_APP_SECRET`,
`CHATBOT_PHONE_ID`, `CHATBOT_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`.

### Al desplegar

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
```

### Un worker de cola, siempre vivo

Sin esto el chatbot recibe los mensajes y no responde nunca: el webhook
encola y nadie desencola.

```bash
php artisan queue:work --tries=2 --timeout=200
```

En Render es un *background worker* aparte; en un VPS, un servicio de
systemd o supervisor que lo reinicie si se cae.

## 2. El sitio (`web/`)

En Vercel, con el directorio raíz apuntando a `web/`.

```bash
BACKEND_URL=https://api.tudominio.co      # a dónde apunta el proxy
NEXT_PUBLIC_WHATSAPP=573222248487         # sin "+", sin espacios
REVALIDAR_SECRETO=                        # el MISMO valor que en el backend
```

`REVALIDAR_SECRETO` es lo que permite que un cambio hecho por WhatsApp se vea
en la página de una, sin esperar el minuto del caché. Si los dos valores no
coinciden, el backend recibe un 401 y el sitio se refresca solo por tiempo —
no se rompe nada, pero se pierde la inmediatez.

`BACKEND_URL` es de servidor, no lleva `NEXT_PUBLIC_`: el navegador no debe
conocer la URL del backend. Todas las peticiones salen por `/api-tienda/*` y
los archivos por `/tienda-storage/*`, que Next reescribe hacia la API.

La página se regenera cada 60 segundos (ISR), así que una ráfaga de visitas
se atiende desde el CDN y el backend recibe alrededor de una petición por
minuto.

## 3. El webhook de WhatsApp

En el panel de desarrolladores de Meta, en el producto WhatsApp:

1. **URL de devolución de llamada**: `https://api.tudominio.co/api/chatbot/webhook`
2. **Token de verificación**: el mismo valor de `CHATBOT_VERIFY_TOKEN`.
3. Suscribirse al campo **`messages`**.

Meta pega primero con un `GET` para verificar; si el token coincide, la API le
devuelve su `hub.challenge` y queda registrado.

Para probar en local, exponer el puerto 8001 con ngrok y usar esa URL. En
desarrollo se permite el webhook sin `CHATBOT_APP_SECRET`; en producción no.

## Lista de chequeo antes de abrir al público

- [ ] `APP_DEBUG=false` y `APP_KEY` generada para este entorno.
- [ ] Contraseña del usuario admin cambiada (el seeder deja `password`).
- [ ] `ADMIN_TOKEN` aleatorio, no el de ejemplo.
- [ ] `CORS_ALLOWED_ORIGINS` con el dominio real.
- [ ] `CHATBOT_ADMINS` con los números autorizados y `CHATBOT_APP_SECRET`
      puesto — sin ellos el bot queda abierto o mudo.
- [ ] El worker de cola corriendo y vigilado.
- [ ] `NEXT_PUBLIC_WHATSAPP` con el número real de pedidos.
- [ ] `ffmpeg` instalado si se van a subir videos desde el panel (si no está,
      el video se guarda sin comprimir en vez de fallar).
