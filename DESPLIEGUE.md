# Despliegue

El sitio vive en un VPS de Hostinger (Ubuntu 24.04), todo en la misma máquina:

| Qué | Dónde |
|---|---|
| Sitio y panel | <https://danielbuitron.com> · <https://www.danielbuitron.com> |
| API | <https://api.danielbuitron.com> |
| Servidor | `72.61.98.122` — `ssh root@72.61.98.122` |
| Código | `/var/www/daniel` |

## Cómo está armado

```
Internet ──► nginx :443 ──┬─► danielbuitron.com      ──► Next.js en :3000 (pm2)
                          └─► api.danielbuitron.com  ──► PHP-FPM (Laravel)

                 Next.js ──► 127.0.0.1:8080 ──► la misma API, por dentro
```

Las llamadas del sitio a la API **no salen a internet**: Next las reescribe
(`/api-tienda/*` y `/tienda-storage/*`) hacia `127.0.0.1:8080`, donde nginx
sirve Laravel sin TLS. El navegador nunca ve la URL de la API, no hay CORS que
configurar y el render del servidor no paga el handshake.

`api.danielbuitron.com` existe igual, público, porque el webhook de WhatsApp
necesita una dirección a la que Meta pueda llegar.

| Servicio | Para qué | Comprobar |
|---|---|---|
| `nginx` | reparte el tráfico y termina el TLS | `systemctl status nginx` |
| `php8.3-fpm` | ejecuta Laravel | `systemctl status php8.3-fpm` |
| `pm2` → `daniel-web` | mantiene vivo Next.js | `pm2 status` |
| `daniel-worker` | cola de trabajos (chatbot, correos) | `systemctl status daniel-worker` |
| `certbot.timer` | renueva el certificado solo | `systemctl list-timers certbot*` |

Base de datos: **SQLite**, en `/var/www/daniel/api/database/database.sqlite`.
Para un catálogo que edita una persona sobra, y evita una contraseña más que
guardar. Las fotos y los videos **no** van en la base: se guardan en
`api/storage/app/public` y la base solo conserva la ruta.

## Actualizar después de un cambio

Con el cambio ya en `main`:

```bash
ssh root@72.61.98.122 '/var/www/daniel/scripts/actualizar.sh'
```

El script hace `git pull`, instala, **migra**, reconstruye las cachés de
Laravel, recompila el sitio, reinicia todo y verifica que las dos partes
respondan. Corta a la primera falla, así que si algo sale mal el servicio
viejo sigue arriba.

## Los secretos

Viven **solo en el servidor**, en los dos `.env` (`api/.env` y
`web/.env.production`, ambos en modo 600) y con copia en `/root/secretos/`.
Nunca están en el repositorio.

| Cuál | Para qué |
|---|---|
| `APP_KEY` | cifrado de sesiones de Laravel |
| `ADMIN_TOKEN` | el panel le habla a la API con él. **Debe ser idéntico en los dos `.env`** o el panel recibe 401 en todo |
| `ADMIN_PASSWORD` | con la que se entra a `/admin` |
| `REVALIDAR_SECRETO` | deja que la API refresque el caché del sitio al guardar algo |

**Ver la contraseña del panel** (sale en tu terminal, no en ningún chat):

```bash
ssh root@72.61.98.122 'cat /root/secretos/admin_password; echo'
```

**Cambiarla** por una tuya:

```bash
ssh root@72.61.98.122 'read -p "Nueva contraseña: " P; \
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$P|" /var/www/daniel/web/.env.production; \
  printf "%s" "$P" > /root/secretos/admin_password; \
  cd /var/www/daniel/web && npm run build && pm2 restart daniel-web --update-env'
```

Hay que recompilar porque Next lee las variables al construir, no al arrancar.

## Copias de seguridad

Lo único irrecuperable son **la base y los archivos subidos**. Para bajarlos:

```bash
ssh root@72.61.98.122 'tar czf - -C /var/www/daniel/api database/database.sqlite storage/app/public' \
  > respaldo-$(date +%F).tar.gz
```

Guárdalo fuera del servidor. Para restaurar, súbelo y descomprímelo en el mismo
sitio; después `chown -R www-data:www-data` sobre `database` y `storage`.

## Cosas que conviene saber

- **Subidas hasta 128 MB** (`upload_max_filesize` en PHP y `client_max_body_size`
  en nginx). Un video de portada pesa bastante menos ya comprimido, pero el
  material en crudo del cliente no.
- **`ffmpeg` está instalado** y es lo que usa la API para recomprimir los videos
  que suban por el panel. Si falta, las subidas de video fallan.
- **El certificado se renueva solo** con `certbot.timer`. Para probar la
  renovación sin esperar: `certbot renew --dry-run`.
- **Un núcleo de CPU**: el `npm run build` tarda un par de minutos. Es normal.
- Si el sitio deja de responder: `pm2 logs daniel-web --lines 50`.
  Si la API falla: `tail -50 /var/www/daniel/api/storage/logs/laravel.log`.

## Lo que falta (no es del despliegue)

- **El número de WhatsApp real.** Hoy `NEXT_PUBLIC_WHATSAPP` en
  `web/.env.production` es el de pruebas; los pedidos llegan ahí.
- **Las cifras de la portada** (+400 baristas, 100 productos) salen del mockup
  y no están confirmadas. Están en `CIFRAS`, al principio de `Hero.tsx`.
- **El chatbot de WhatsApp** necesita las credenciales de Meta en `api/.env` y
  apuntar el webhook a `https://api.danielbuitron.com/api/chatbot/webhook`.
