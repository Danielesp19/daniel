<?php

namespace App\Support\Chatbot;

use App\Support\ImageOptimizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Habla con la API de WhatsApp Cloud (Meta): envía texto y baja las fotos que
 * manda el administrador.
 *
 * Las respuestas del bot son solo texto. Las fotos van en un sentido: de él
 * hacia el catálogo, que es lo que permite cambiar la imagen de un producto
 * sin abrir el panel.
 */
class WhatsApp
{
    /** Versión de la API de Graph. Meta la sostiene ~2 años por versión. */
    private const VERSION = 'v21.0';

    /**
     * Tope de la foto que se acepta desde el chat. WhatsApp ya comprime las
     * imágenes que envía un teléfono, así que esto es una red de seguridad
     * contra un archivo raro, no el caso normal.
     */
    private const MAX_BYTES_MEDIA = 12 * 1024 * 1024;

    /**
     * WhatsApp corta los mensajes de texto en 4096 caracteres. Se recorta
     * antes de enviar para que el mensaje llegue —aunque incompleto— en vez
     * de que Meta rechace la petición entera.
     */
    private const MAX_CARACTERES = 4000;

    public function enviar(string $a, string $texto): bool
    {
        $phoneId = (string) config('tienda.chatbot.phone_id');
        $token = (string) config('tienda.chatbot.access_token');

        if ($phoneId === '' || $token === '') {
            Log::warning('Chatbot: WhatsApp sin configurar (phone_id o access_token vacíos)');

            return false;
        }

        if (mb_strlen($texto) > self::MAX_CARACTERES) {
            $texto = mb_substr($texto, 0, self::MAX_CARACTERES - 1).'…';
        }

        $respuesta = Http::withToken($token)
            ->timeout(15)
            // Un solo reintento: si Meta está caída, insistir dentro de la
            // petición solo alarga el job. La cola ya reintenta el job entero.
            ->retry(1, 500, throw: false)
            ->post('https://graph.facebook.com/'.self::VERSION."/{$phoneId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => $a,
                'type' => 'text',
                'text' => ['body' => $texto],
            ]);

        if ($respuesta->failed()) {
            Log::error('Chatbot: WhatsApp rechazó el envío', [
                'estado' => $respuesta->status(),
                'respuesta' => $respuesta->json() ?? $respuesta->body(),
            ]);

            return false;
        }

        return true;
    }

    /**
     * Baja una foto enviada al chat y la deja optimizada en el disco público.
     *
     * Son dos viajes, así funciona Meta: primero se pregunta por el medio y
     * responde con una URL temporal, y después se baja esa URL. Las dos
     * llamadas van firmadas con el token — la URL sola no sirve.
     *
     * Devuelve la ruta relativa dentro del disco `public`, o null si algo
     * falló (el asistente se lo explica al admin y no pasa nada más).
     */
    public function descargarFoto(string $mediaId, string $directorio = 'productos'): ?string
    {
        $token = (string) config('tienda.chatbot.access_token');
        if ($token === '') {
            Log::warning('Chatbot: no se puede bajar la foto, falta el access_token');

            return null;
        }

        try {
            $meta = Http::withToken($token)->timeout(15)
                ->get('https://graph.facebook.com/'.self::VERSION."/{$mediaId}");

            if ($meta->failed()) {
                Log::error('Chatbot: Meta no dio la URL del medio', ['estado' => $meta->status()]);

                return null;
            }

            $url = (string) $meta->json('url');
            $mime = (string) $meta->json('mime_type');
            $peso = (int) $meta->json('file_size');

            if ($url === '') {
                return null;
            }
            if (! str_starts_with($mime, 'image/')) {
                Log::info('Chatbot: el medio no es una imagen', ['mime' => $mime]);

                return null;
            }
            if ($peso > self::MAX_BYTES_MEDIA) {
                Log::info('Chatbot: la foto supera el tope', ['bytes' => $peso]);

                return null;
            }

            // La URL del medio también exige el token: sin él devuelve 401.
            $binario = Http::withToken($token)->timeout(30)->get($url);
            if ($binario->failed()) {
                Log::error('Chatbot: falló la descarga del medio', ['estado' => $binario->status()]);

                return null;
            }

            // ImageOptimizer trabaja sobre un archivo en disco, así que la
            // foto pasa por un temporal antes de reducirse y volverse WebP.
            $temporal = tempnam(sys_get_temp_dir(), 'wa-foto-');
            file_put_contents($temporal, $binario->body());

            try {
                $extension = str_replace('image/', '', $mime) ?: 'jpg';
                // El último `true` pone el UploadedFile en modo de prueba: sin
                // eso, Symfony exige que el archivo venga de un upload HTTP
                // real y rechaza uno construido a mano.
                $archivo = new UploadedFile($temporal, "foto.{$extension}", $mime, null, true);

                return ImageOptimizer::store($archivo, $directorio);
            } finally {
                @unlink($temporal);
            }
        } catch (\Throwable $e) {
            Log::error('Chatbot: excepción bajando la foto', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
