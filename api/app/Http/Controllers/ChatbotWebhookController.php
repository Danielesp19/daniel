<?php

namespace App\Http\Controllers;

use App\Jobs\ResponderMensajeChatbot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Webhook de WhatsApp Cloud (Meta).
 *
 * Este endpoint es público —quien llama es Meta, no nosotros— así que la
 * seguridad está en tres capas, todas obligatorias:
 *
 *   1. Firma HMAC del cuerpo crudo con el secreto de la app: demuestra que el
 *      mensaje viene de Meta y que nadie lo alteró en el camino.
 *   2. Lista blanca de números: solo los administradores configurados pueden
 *      darle órdenes al bot. Un mensaje de cualquier otro número se ignora en
 *      silencio (sin responder: contestar "no estás autorizado" le confirma a
 *      un desconocido que este número es un bot de administración).
 *   3. Límite de tasa por remitente (ver AppServiceProvider), porque cada
 *      respuesta gasta tokens de la API de Claude.
 */
class ChatbotWebhookController extends Controller
{
    /**
     * Verificación inicial del webhook. Meta pega una vez con GET al
     * registrar la URL y espera que le devuelvas su `hub.challenge` en texto
     * plano si el `hub.verify_token` coincide con el que configuraste.
     *
     * Los parámetros se leen con guion bajo (`hub_verify_token`) aunque Meta
     * los manda con punto (`hub.verify_token`): PHP reemplaza los puntos por
     * guiones bajos al armar $_GET, así que con el punto nunca se encuentran.
     */
    public function verificar(Request $request)
    {
        $esperado = (string) config('tienda.chatbot.verify_token');
        $recibido = (string) $request->query('hub_verify_token');

        if ($esperado === '' || ! hash_equals($esperado, $recibido)) {
            return response('Forbidden', 403);
        }

        return response((string) $request->query('hub_challenge'), 200)
            ->header('Content-Type', 'text/plain');
    }

    public function recibir(Request $request)
    {
        if (! $this->firmaValida($request)) {
            return response()->json(['error' => 'Firma inválida'], 403);
        }

        // A Meta se le responde 200 SIEMPRE y de inmediato. Un error nuestro
        // no es asunto suyo: si devolvemos otra cosa, reintenta el mismo
        // mensaje una y otra vez y termina desactivando el webhook.
        foreach ($this->mensajesDe($request) as $mensaje) {
            $this->encolar($mensaje);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Verifica la firma HMAC-SHA256 del cuerpo crudo.
     *
     * Sobre el cuerpo CRUDO, no sobre el JSON re-serializado: cualquier
     * diferencia de espacios, orden de llaves o escape de unicode cambiaría el
     * hash y toda petición legítima fallaría.
     */
    private function firmaValida(Request $request): bool
    {
        $secreto = (string) config('tienda.chatbot.app_secret');

        if ($secreto === '') {
            // Sin secreto configurado el webhook queda abierto a internet.
            // En local se permite para poder probar con ngrok; en producción
            // se rechaza, porque un webhook sin firma es una puerta abierta a
            // la base de datos.
            if (app()->environment('production')) {
                Log::error('Chatbot: CHATBOT_APP_SECRET vacío en producción — webhook rechazado');

                return false;
            }

            return true;
        }

        $firma = (string) $request->header('X-Hub-Signature-256');
        if (! str_starts_with($firma, 'sha256=')) {
            return false;
        }

        $calculada = 'sha256='.hash_hmac('sha256', $request->getContent(), $secreto);

        // Comparación en tiempo constante: evita filtrar la firma correcta
        // midiendo cuánto tarda el rechazo.
        return hash_equals($calculada, $firma);
    }

    /**
     * Extrae del sobre que manda Meta los mensajes que sabemos atender.
     *
     * El payload trae de todo (acuses de entrega, cambios de estado,
     * reacciones); solo interesan dos cosas: texto y fotos. Una foto puede
     * venir con pie de foto o sin él —"esta es la del bourbon" o nada—, así
     * que el pie viaja como el texto del mensaje y el asistente decide qué
     * hacer con la imagen.
     *
     * @return array<int, array{id: string, de: string, texto: string, foto: ?string}>
     */
    private function mensajesDe(Request $request): array
    {
        $mensajes = [];

        foreach ($request->input('entry', []) as $entrada) {
            foreach ($entrada['changes'] ?? [] as $cambio) {
                foreach ($cambio['value']['messages'] ?? [] as $mensaje) {
                    $tipo = $mensaje['type'] ?? null;

                    $texto = '';
                    $foto = null;

                    if ($tipo === 'text') {
                        $texto = trim((string) ($mensaje['text']['body'] ?? ''));
                    } elseif ($tipo === 'image') {
                        $foto = (string) ($mensaje['image']['id'] ?? '') ?: null;
                        $texto = trim((string) ($mensaje['image']['caption'] ?? ''));
                    }

                    // Un mensaje sin nada que procesar (un sticker, un audio)
                    // se ignora en silencio.
                    if ($texto === '' && $foto === null) {
                        continue;
                    }

                    $mensajes[] = [
                        'id' => (string) ($mensaje['id'] ?? ''),
                        'de' => (string) ($mensaje['from'] ?? ''),
                        'texto' => $texto,
                        'foto' => $foto,
                    ];
                }
            }
        }

        return $mensajes;
    }

    /** @param array{id: string, de: string, texto: string, foto: ?string} $mensaje */
    private function encolar(array $mensaje): void
    {
        $admins = (array) config('tienda.chatbot.admins');

        // Silencio deliberado ante un número no autorizado: ver el comentario
        // de la clase.
        if (! in_array($mensaje['de'], $admins, true)) {
            Log::info('Chatbot: mensaje de un número no autorizado', [
                'de' => substr($mensaje['de'], -4),
            ]);

            return;
        }

        // Meta reenvía el mismo mensaje si no alcanzó a ver nuestro 200 (y a
        // veces aunque lo haya visto). Sin esta marca, un reenvío ejecutaría
        // el ajuste de stock por segunda vez y sumaría las bolsas dos veces.
        if ($mensaje['id'] !== '' && ! Cache::add('chatbot:msg:'.$mensaje['id'], true, now()->addHours(6))) {
            return;
        }

        ResponderMensajeChatbot::dispatch($mensaje['de'], $mensaje['texto'], $mensaje['foto']);
    }
}
