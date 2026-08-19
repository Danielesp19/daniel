# Despliegue

Dos piezas separadas: la **API** (`api/`, Laravel) en AWS y el **sitio**
(`web/`, Next.js) en Vercel. El sitio le pega a la API a través de su propio
proxy, así que el navegador nunca ve el dominio del backend.

El panel de administración vive **dentro del sitio**, en `/admin`, y se abre
con una contraseña compartida que el servidor de Next cambia por el token de la
API. No hay usuarios en base de datos.

---

## Antes de empezar: dos decisiones que hay que tomar

### 1. Dónde se guardan las fotos y los videos

Lo que se sube desde el panel se guarda en `storage/app/public`, **dentro del
servidor**. Eso obliga a elegir:

| Servicio de AWS | Disco | Qué pasa con las fotos |
| --- | --- | --- |
| **Lightsail (instancia)** | persistente | Sobreviven. **Recomendado para provisional.** |
| EC2 | persistente | Sobreviven. |
| App Runner / ECS Fargate | efímero | **Se borran en cada despliegue.** |

Para pasar a S3 no basta con cambiar `FILESYSTEM_DISK`: `VideoOptimizer` usa
`$disk->path()` para pasarle el archivo a ffmpeg, y S3 no tiene rutas locales.
Habría que bajar el video a un temporal, procesarlo y subirlo. **No está hecho.**

Por eso, para un despliegue provisional: **Lightsail con una instancia**, no
contenedores.

### 2. Qué base de datos

- **SQLite** sobre el disco de la instancia: cero infraestructura, suficiente
  para provisional. Es lo que corre hoy en local.
- **RDS Postgres**: lo correcto para producción. El `Dockerfile` ya trae
  `pdo_pgsql`, y `.env.example` tiene el bloque listo y comentado.

---

## 1. La API en AWS Lightsail

### Crear la instancia

1. Lightsail → **Create instance** → Linux/Unix → **OS Only: Ubuntu 22.04**.
2. Plan: el de **2 GB de RAM** (el de 512 MB se queda corto al comprimir video
   con ffmpeg).
3. Networking → **Create static IP** y asignarla a la instancia. Sin IP fija,
   cada reinicio cambia la dirección.
4. Networking → Firewall → abrir **HTTP (80)** y **HTTPS (443)**.

### Instalar lo necesario

```bash
sudo apt update
sudo apt install -y php8.3-cli php8.3-fpm php8.3-sqlite3 php8.3-pgsql \
  php8.3-gd php8.3-zip php8.3-bcmath php8.3-intl php8.3-curl \
  nginx ffmpeg git unzip composer
```

`ffmpeg` no es opcional si se van a subir videos: sin él el video se guarda sin
comprimir y sin póster, en vez de fallar.

### Traer el código

```bash
cd /var/www
sudo git clone https://github.com/Danielesp19/daniel.git
sudo chown -R $USER:www-data daniel
cd daniel/api
composer install --no-dev --optimize-autoloader
```

### Configurar

```bash
cp .env.example .env
php artisan key:generate
```

Y editar `.env`:

```bash
APP_ENV=production
APP_DEBUG=false                      # nunca true: filtra trazas y secretos
APP_URL=https://api.tudominio.co     # o http://TU-IP-FIJA mientras no haya dominio

# SQLite (provisional). Para Postgres, descomentar el bloque pgsql.
DB_CONNECTION=sqlite

# Token de la API de administración: largo y aleatorio.
#   php -r "echo bin2hex(random_bytes(32));"
ADMIN_TOKEN=

# Dominio del sitio en Vercel, sin barra final y separados por coma.
CORS_ALLOWED_ORIGINS=https://tudominio.vercel.app

# Para que un cambio hecho desde el panel o por WhatsApp se vea de una,
# sin esperar el minuto del caché. El secreto debe ser el mismo en Vercel.
SITIO_URL=https://tudominio.vercel.app
REVALIDAR_SECRETO=

QUEUE_CONNECTION=database            # obligatoria: el chatbot encola aquí
```

### Preparar la base

```bash
touch database/database.sqlite
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
sudo chown -R www-data:www-data storage bootstrap/cache database
```

Para sembrar el catálogo de ejemplo y ver el sitio con contenido:

```bash
php artisan db:seed --force
```

**Ojo:** son datos inventados —fincas que no existen, un aviso que anuncia una
feria falsa, tiempos de envío por confirmar—. Antes de mostrarle esto a un
cliente hay que corregirlo desde el panel.

### nginx

`/etc/nginx/sites-available/altura`:

```nginx
server {
    listen 80;
    server_name api.tudominio.co;
    root /var/www/daniel/api/public;

    index index.php;
    charset utf-8;

    # Videos y fotos del panel: hasta 128M, igual que docker/uploads.ini.
    client_max_body_size 128M;

    location / { try_files $uri $uri/ /index.php?$query_string; }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;   # comprimir un video tarda
    }

    location ~ /\.(?!well-known).* { deny all; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/altura /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### HTTPS: no hace falta para arrancar

El navegador **nunca** habla con la API. Todo sale por rutas relativas
—`/api-tienda/*` y `/tienda-storage/*`— que Vercel reenvía **desde su
servidor**, así que no hay contenido mixto que bloquear. Con la IP fija y HTTP
plano el sitio funciona completo, panel incluido.

Lo que sí implica: el tramo entre Vercel y la instancia va **sin cifrar**, y por
ahí viaja el `ADMIN_TOKEN` en cada petición del panel. Para un despliegue
provisional es un riesgo asumible; antes de manejar pedidos reales hay que
cerrarlo.

Cuando haya dominio:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.tudominio.co --redirect
```

### El worker de la cola

Sin esto el chatbot recibe los mensajes y no responde nunca: el webhook encola
y nadie desencola.

`/etc/systemd/system/altura-worker.service`:

```ini
[Unit]
Description=Worker de cola de Altura
After=network.target

[Service]
User=www-data
Restart=always
RestartSec=5
WorkingDirectory=/var/www/daniel/api
ExecStart=/usr/bin/php artisan queue:work --tries=2 --timeout=200

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now altura-worker
```

### Actualizar después de un cambio

```bash
cd /var/www/daniel && git pull
cd api && composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache
sudo systemctl restart altura-worker php8.3-fpm
```

---

## 2. El sitio en Vercel

**Import Project** → el repositorio → **Root Directory: `web`**. Next.js se
detecta solo.

Variables de entorno (Production):

```bash
BACKEND_URL=https://api.tudominio.co        # a dónde apunta el proxy
API_INTERNA=https://api.tudominio.co/api    # el render del servidor, directo
NEXT_PUBLIC_WHATSAPP=573222248487           # sin "+", sin espacios

# Panel de administración (/admin)
ADMIN_PASSWORD=                             # con la que se entra
ADMIN_TOKEN=                                # el MISMO valor que en la API

REVALIDAR_SECRETO=                          # el MISMO valor que en la API
```

`BACKEND_URL` y `ADMIN_TOKEN` **no** llevan `NEXT_PUBLIC_`: son de servidor. El
navegador nunca conoce la URL del backend ni el token — todas las peticiones
salen por `/api-tienda/*` y los archivos por `/tienda-storage/*`, que Next
reescribe hacia la API.

Si `ADMIN_TOKEN` no coincide exactamente con el de la API, el panel entra pero
recibe **401 en todo**. Es el error más común.

La página se regenera cada 60 segundos (ISR): una ráfaga de visitas se atiende
desde el CDN y el backend recibe alrededor de una petición por minuto.

---

## 3. El webhook de WhatsApp

En el panel de desarrolladores de Meta, producto WhatsApp:

1. **URL de devolución de llamada**: `https://api.tudominio.co/api/chatbot/webhook`
2. **Token de verificación**: el mismo valor de `CHATBOT_VERIFY_TOKEN`.
3. Suscribirse al campo **`messages`**.

Meta pega primero con un `GET`; si el token coincide, la API le devuelve su
`hub.challenge` y queda registrado.

Para probar en local, exponer el puerto con ngrok y usar esa URL. En desarrollo
se permite el webhook sin `CHATBOT_APP_SECRET`; en producción no.

---

## Lista de chequeo antes de abrir al público

- [ ] `APP_DEBUG=false` y `APP_KEY` generada para este entorno.
- [ ] `ADMIN_TOKEN` aleatorio —no `altura-admin-secret-cambiar`— y **idéntico**
      en la API y en Vercel.
- [ ] `ADMIN_PASSWORD` cambiada: en local es `altura`.
- [ ] `CORS_ALLOWED_ORIGINS` con el dominio real de Vercel.
- [ ] HTTPS en la API. No es necesario para que funcione —el navegador no
      la toca— pero sin él el `ADMIN_TOKEN` viaja en claro entre Vercel y AWS.
- [ ] El disco donde viven las fotos es persistente (ver arriba).
- [ ] Copia de la base: si es SQLite, es un archivo —`database/database.sqlite`—
      y hay que respaldarlo; Lightsail tiene snapshots automáticos.
- [ ] `NEXT_PUBLIC_WHATSAPP` con el número real de pedidos (hoy es de pruebas).
- [ ] Contenido de ejemplo corregido: el aviso anuncia una feria inventada y las
      preguntas frecuentes hablan de tiempos de envío sin confirmar.
- [ ] Licencia del video de portada: el archivo actual viene de una descarga de
      vista previa de iStock y **no está licenciado para publicarse**.
- [ ] `CHATBOT_ADMINS` con los números autorizados y `CHATBOT_APP_SECRET`
      puesto — sin ellos el bot queda abierto o mudo.
- [ ] El worker de cola corriendo y vigilado.
