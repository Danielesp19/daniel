#!/usr/bin/env bash
#
# Actualiza el sitio en el VPS después de un cambio en el repositorio.
#
#   ssh root@72.61.98.122 '/var/www/daniel/scripts/actualizar.sh'
#
# Hace lo mínimo y en el orden que importa: primero la API (migrar antes de
# que el sitio nuevo pida columnas que aún no existen) y después el sitio.
# `set -e` corta a la primera falla: es preferible quedarse a medias con el
# servicio viejo corriendo que dejar el nuevo a medio instalar.
set -e

D=/var/www/daniel
cd "$D"

echo "── Código ──────────────────────────────────────────"
git pull --ff-only

echo "── API ─────────────────────────────────────────────"
cd "$D/api"
composer install --no-dev --optimize-autoloader -q
php artisan migrate --force
# Las cachés se reconstruyen SIEMPRE: si el .env o las rutas cambiaron y se
# quedan las viejas, la API sirve la configuración anterior sin avisar.
php artisan config:cache -q
php artisan route:cache -q
chown -R www-data:www-data storage bootstrap/cache database
systemctl restart php8.3-fpm daniel-worker

echo "── Sitio ───────────────────────────────────────────"
cd "$D/web"
npm ci --no-audit --no-fund --silent
npm run build
pm2 restart daniel-web --update-env

echo "── Verificación ────────────────────────────────────"
sleep 4
curl -fsS -o /dev/null -w "api  %{http_code}\n" http://127.0.0.1:8080/up
curl -fsS -o /dev/null -w "web  %{http_code}\n" http://127.0.0.1:3000/
echo "listo"
