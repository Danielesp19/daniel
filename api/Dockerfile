# ── ALTURA — backend Laravel para Render ──
# Render no tiene runtime PHP nativo, así que se despliega como contenedor Docker.
# Imagen mínima PHP 8.4 (lo exige composer.lock: Laravel 13 → symfony 8 pide php >=8.4)
# + extensiones para PostgreSQL y Filament (gd, zip, bcmath, exif, intl).
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
