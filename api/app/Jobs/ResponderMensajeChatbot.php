<?php

namespace App\Jobs;

use App\Support\Chatbot\Asistente;
use App\Support\Chatbot\WhatsApp;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Piensa la respuesta y la envía.
 *
 * Va en cola porque Meta espera un 200 del webhook en pocos segundos y da el
 * mensaje por fallido si no llega — mientras que una vuelta del modelo con
 * herramientas, más la descarga de una foto, puede tardar bastante más. El
 * webhook responde de inmediato y el trabajo de verdad ocurre acá.
 */
class ResponderMensajeChatbot implements ShouldQueue
{
    use Queueable;

    /** Dos intentos: si el segundo también falla, es un problema de fondo. */
    public int $tries = 2;

    /** Tope duro por si el modelo se queda pensando de más. */
    public int $timeout = 180;

    /**
     * @param  string  $de  Número del admin en E.164 sin "+".
     * @param  string  $texto  El mensaje, o el pie de foto si mandó una imagen.
     * @param  string|null  $mediaId  Id del medio en Meta cuando mandó una foto.
     */
    public function __construct(
        private string $de,
        private string $texto,
        private ?string $mediaId = null,
    ) {}

    public function handle(Asistente $asistente, WhatsApp $whatsapp): void
    {
        $whatsapp->enviar(
            $this->de,
            $asistente->responder($this->texto, $this->de, $this->mediaId),
        );
    }

    public function failed(\Throwable $e): void
    {
        Log::error('Chatbot: el job murió', ['error' => $e->getMessage()]);

        // Último recurso: que el admin sepa que su mensaje se perdió en vez de
        // quedarse esperando una respuesta que no va a llegar.
        try {
            (new WhatsApp)->enviar($this->de, 'No pude procesar tu mensaje. Vuelve a intentarlo.');
        } catch (\Throwable) {
            // Si ni esto sale, ya quedó en el log de arriba.
        }
    }
}
