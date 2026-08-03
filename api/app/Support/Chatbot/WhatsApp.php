<?php

namespace App\Support\Chatbot;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envío de mensajes por la API de WhatsApp Cloud (Meta).
 *
 * Solo texto: el asistente de inventario responde con frases, no manda fotos
 * ni plantillas. Si algún día hace falta enviar la foto de un producto, va
 * aquí como un método aparte.
 */
class WhatsApp
{
    /** Versión de la API de Graph. Meta la sostiene ~2 años por versión. */
    private const VERSION = 'v21.0';

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
}
