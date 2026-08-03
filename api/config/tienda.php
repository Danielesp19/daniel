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

    // Token Bearer de la API de administración (la que usa el chatbot).
    // DEBE definirse en producción: largo y aleatorio.
    'admin_token' => env('ADMIN_TOKEN'),

    // Zona horaria del negocio.
    'timezone' => env('TIENDA_TIMEZONE', 'America/Bogota'),

    // URL pública del sitio. Se usa para dos cosas: avisarle que el catálogo
    // cambió (y no esperar el minuto del caché) y darle el enlace al admin
    // cuando pregunta "¿cómo quedó?".
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

    /*
    |----------------------------------------------------------------------
    | Chatbot de administración
    |----------------------------------------------------------------------
    |
    | Los administradores consultan y actualizan el inventario por mensajes.
    | `admins` es la lista blanca de números autorizados en formato E.164 sin
    | el "+" (ej: 573001112233), separados por coma. Un mensaje de un número
    | que no esté aquí se ignora: es la única barrera entre WhatsApp y la
    | base de datos, así que no puede quedar vacía en producción.
    |
    */
    'chatbot' => [
        'admins' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('CHATBOT_ADMINS', '')),
        ))),
        // Secreto que WhatsApp/Meta envía para validar el webhook.
        'verify_token' => env('CHATBOT_VERIFY_TOKEN'),
        'app_secret' => env('CHATBOT_APP_SECRET'),
        'phone_id' => env('CHATBOT_PHONE_ID'),
        'access_token' => env('CHATBOT_ACCESS_TOKEN'),
        // Modelo de Claude que interpreta los mensajes.
        'anthropic_key' => env('ANTHROPIC_API_KEY'),
        'modelo' => env('CHATBOT_MODELO', 'claude-opus-5'),
        // Cuántos turnos de la conversación se recuerdan, y por cuánto tiempo.
        // El chat de inventario es de ida y vuelta corta ("cuánto queda del
        // mirador" → "súmale 12"), no una conversación larga.
        'memoria_turnos' => (int) env('CHATBOT_MEMORIA_TURNOS', 12),
        'memoria_minutos' => (int) env('CHATBOT_MEMORIA_MINUTOS', 30),
    ],

];
