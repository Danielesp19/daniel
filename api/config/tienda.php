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

    // A dónde llegan las preguntas que deja la gente en la página.
    //
    // Vacío = solo se guardan en la base y se leen desde el panel. Es el estado
    // por defecto a propósito: sin correo configurado, intentar enviarlo
    // fallaría en silencio y la consulta parecería perdida.
    'consultas_correo' => env('CONSULTAS_CORREO', ''),

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
    | El inventario y el catálogo se administran por mensajes. `admin` es UN
    | solo número —el del dueño— y es la única barrera entre WhatsApp y la
    | base de datos: un mensaje de cualquier otro número se ignora, así que
    | no puede quedar vacío en producción.
    |
    | Se guarda en dígitos pelados (573001112233) porque así manda Meta el
    | remitente. Lo que se escriba en el .env se normaliza: da igual copiarlo
    | de la agenda con "+", con espacios o con guiones.
    |
    */
    'chatbot' => [
        // Antes era una lista (CHATBOT_ADMINS). Se sigue leyendo para no
        // tumbar un despliegue viejo, pero solo cuenta el primero: con varias
        // manos sobre el mismo bot, dos personas se pisan el hilo de la
        // conversación —que es uno solo por número— y nadie sabe quién dejó
        // el catálogo como quedó.
        'admin' => (static function (): string {
            $crudo = (string) env('CHATBOT_ADMIN', '');

            if ($crudo === '') {
                $crudo = explode(',', (string) env('CHATBOT_ADMINS', ''))[0];
            }

            return preg_replace('/\D+/', '', $crudo) ?? '';
        })(),

        // Los que quedaron por fuera al pasar de lista a número único. No
        // autorizan nada: sirven para que el log pueda decir "este número
        // administraba antes" en vez de dejar un silencio sin explicación.
        'admins_jubilados' => array_values(array_filter(array_map(
            static fn (string $numero): string => preg_replace('/\D+/', '', $numero) ?? '',
            array_slice(explode(',', (string) env('CHATBOT_ADMINS', '')), 1),
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

        /*
        |------------------------------------------------------------------
        | Tope de gasto mensual
        |------------------------------------------------------------------
        |
        | Anthropic cobra por token consumido, sin mensualidad. Los límites
        | de su consola son de ellos y avisan tarde; este es el único tope
        | que controla la aplicación, y por eso corta de verdad: pasado el
        | límite el bot responde que llegó al tope SIN llamar a la API.
        |
        | En centavos de dólar (USD) para no arrastrar decimales: 500 = US$5.
        | En cero queda sin tope, que es lo que conviene mientras se mide
        | cuánto gasta de verdad el negocio.
        |
        */
        'tope_mensual_centavos' => (int) env('CHATBOT_TOPE_MENSUAL_USD_CENTAVOS', 0),

        // A qué porcentaje del tope avisar por WhatsApp que se está acabando.
        // Un solo aviso por mes: repetirlo en cada mensaje sería ruido.
        'aviso_tope_porcentaje' => (int) env('CHATBOT_AVISO_TOPE_PORCENTAJE', 80),

        /*
        | Precio por millón de tokens del modelo, en centavos de dólar, para
        | poder convertir tokens en plata sin salir a consultar nada.
        |
        | Los valores por defecto son los de Claude Opus 5, que es el modelo
        | configurado arriba. SI SE CAMBIA `CHATBOT_MODELO`, HAY QUE CAMBIAR
        | ESTOS DOS TAMBIÉN: si no, el medidor cuenta a un precio que ya no
        | es el que se está pagando y el tope deja de valer. Referencia por
        | millón de tokens:
        |   Opus 5      → entrada 500, salida 2500
        |   Sonnet 5    → entrada 200, salida 1000
        |   Haiku 4.5   → entrada 100, salida 500
        | La lectura de caché se cuenta a una décima parte de la entrada,
        | que es la tarifa estándar. El precio vigente manda: está en
        | anthropic.com/pricing.
        */
        'precio_entrada_centavos_millon' => (int) env('CHATBOT_PRECIO_ENTRADA', 500),
        'precio_salida_centavos_millon' => (int) env('CHATBOT_PRECIO_SALIDA', 2500),
    ],

];
