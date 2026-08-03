#!/usr/bin/env sh
set -e

# Render inyecta $PORT (normalmente 10000); por defecto 10000 en local.
PORT="${PORT:-10000}"

echo "→ Enlazando storage público…"
php artisan storage:link || true

echo "→ Migrando base de datos (Postgres)…"
php artisan migrate --force

# Siembra el menú de demo de forma automática. MenuSeeder es idempotente (no hace
# nada si ya hay categorías), así que es seguro ejecutarlo en cada arranque.
# Usamos --class=MenuSeeder (NO db:seed normal: ese crea un usuario con faker,
# ausente en producción --no-dev, y fallaría). El disco es efímero, pero los datos
# del menú viven en Postgres (persistente), así que solo se siembra una vez.
echo "→ Sembrando menú de demo (si está vacío)…"
php artisan db:seed --class=MenuSeeder --force || true

echo "→ Iniciando servidor en 0.0.0.0:${PORT}"
exec php artisan serve --host 0.0.0.0 --port "${PORT}"
