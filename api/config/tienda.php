<?php

/*
|--------------------------------------------------------------------------
| Configuración de la tienda
|--------------------------------------------------------------------------
|
| IMPORTANTE: leer estos valores con config('tienda.*') y NUNCA con env()
| dentro del código. En producción se corre `php artisan config:cache` y a
| partir de ahí env() devuelve null fuera de los archivos de config.
|
*/

return [

    // Token Bearer de la API de administración (la que usa el panel).
    // DEBE definirse en producción: largo y aleatorio.
    'admin_token' => env('ADMIN_TOKEN'),

    // A dónde llegan las preguntas que deja la gente en la página.
    //
    // Vacío = solo se guardan en la base y se leen desde el panel. Es el estado
    // por defecto a propósito: sin correo configurado, intentar enviarlo
    // fallaría en silencio y la consulta parecería perdida.
    'consultas_correo' => env('CONSULTAS_CORREO', ''),

    // Zona horaria del negocio.
    'timezone' => env('TIENDA_TIMEZONE', 'America/Bogota'),

    // URL pública del sitio: se usa para avisarle que el catálogo cambió y
    // que se regenere, sin esperar el minuto del caché.
    'sitio_url' => rtrim((string) env('SITIO_URL', ''), '/'),
    'revalidar_secreto' => env('REVALIDAR_SECRETO'),

    // Imágenes subidas: lado máximo en píxeles y calidad WebP (30-100).
    'max_image_px' => (int) env('MAX_IMAGE_PX', 1800),
    'image_quality' => (int) env('IMAGE_QUALITY', 87),

    // Videos subidos: se recomprimen con FFmpeg (H.264, sin audio) al subirlos.
    // CRF más alto = más compresión (30 deja un clip de ~10s en ~1-3 MB).
    'ffmpeg' => env('FFMPEG_PATH', 'ffmpeg'),
    'max_video_px' => (int) env('MAX_VIDEO_PX', 720),
    'video_crf' => (int) env('VIDEO_CRF', 30),

    // Orígenes permitidos para CORS, separados por coma.
    // (en local, localhost se permite automáticamente).
    'cors_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
    ))),

];
