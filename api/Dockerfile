# ── Backend Laravel, como contenedor ──
# Sirve para cualquier hosting que corra Docker (App Runner, Lightsail, Render).
# Imagen PHP 8.4 (lo exige composer.lock: Laravel 13 → symfony 8 pide php >=8.4)
# + las extensiones que necesitan Postgres y el procesado de imágenes
# (gd, zip, bcmath, exif, intl).
#
# OJO CON EL DISCO: las fotos y los videos que se suben desde el panel se
# guardan en storage/app/public, dentro del contenedor. En un hosting sin disco
# persistente (App Runner, ECS, Render) eso se borra en cada despliegue. Ver
# DESPLIEGUE.md.
FROM php:8.4-cli

# Dependencias del sistema para compilar las extensiones PHP.
# ffmpeg: genera el poster JPEG del primer frame al subir videos de productos.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip ffmpeg libpq-dev libzip-dev libpng-dev libjpeg-dev libfreetype6-dev libicu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql pgsql gd zip bcmath exif intl \
    && rm -rf /var/lib/apt/lists/*

# Límites de subida (default PHP 2M/8M → 422 al subir videos). Sube a 128M.
COPY docker/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

# Composer (binario oficial).
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copiar la app e instalar dependencias de producción.
COPY . .
RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && chmod -R 775 storage bootstrap/cache

# Script de arranque: migra y levanta el servidor.
RUN chmod +x docker/entrypoint.sh
ENTRYPOINT ["/app/docker/entrypoint.sh"]
