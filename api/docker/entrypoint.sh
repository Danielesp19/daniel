#!/usr/bin/env sh
set -e

# El puerto lo inyecta el hosting (App Runner, Render, Lightsail Containers).
PORT="${PORT:-10000}"

echo "→ Enlazando storage público…"
php artisan storage:link || true

echo "→ Migrando base de datos…"
php artisan migrate --force

# Sembrado de demostración, APAGADO por defecto.
#
# Es contenido de ejemplo —cafés con fincas inventadas, un aviso que anuncia
# una feria que no existe— y meterlo en la base de una tienda real sería peor
# que dejarla vacía. Se enciende a propósito con SEMBRAR_DEMO=true para un
# despliegue de prueba, y solo hace algo si no hay categorías: así reiniciar el
# contenedor no duplica el catálogo ni pisa lo que ya cargaron desde el panel.
if [ "${SEMBRAR_DEMO}" = "true" ]; then
  CATEGORIAS=$(php artisan tinker --execute="echo \App\Models\Categoria::count();" 2>/dev/null | tail -n1 | tr -dc '0-9')
  if [ "${CATEGORIAS:-0}" = "0" ]; then
    echo "→ Base vacía: sembrando catálogo de demostración…"
    php artisan db:seed --force || true
  else
    echo "→ Ya hay catálogo; no se siembra."
  fi
fi

# Cachés de producción. Van DESPUÉS de migrar: si la configuración se cachea
# antes de que existan las variables de entorno definitivas, queda congelada la
# equivocada.
echo "→ Cacheando configuración y rutas…"
php artisan config:cache
php artisan route:cache

# OJO: `artisan serve` es el servidor de desarrollo de PHP y atiende de a una
# petición a la vez. Alcanza para un despliegue provisional; para producción de
# verdad, nginx + php-fpm o FrankenPHP.
echo "→ Iniciando servidor en 0.0.0.0:${PORT}"
exec php artisan serve --host 0.0.0.0 --port "${PORT}"
