<?php

namespace App\Jobs;

use App\Support\Chatbot\Asistente;
use App\Support\Chatbot\WhatsApp;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;
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

    /**
     * Dos fallas de verdad y se rinde. No es `$tries` porque un mensaje que
     * espera su turno detrás de otro se devuelve a la cola, y eso gastaría
     * intentos sin haber fallado nada: a la tercera foto de una ráfaga se
     * habría quedado sin turnos antes de llegar a procesarse.
     */
    public int $maxExceptions = 2;

    /** Tope duro por si el modelo se queda pensando de más. */
    public int $timeout = 180;

    /**
     * Cuánto puede seguir intentándolo, contando las esperas.
     *
     * Reemplaza al conteo de intentos: lo que importa es que un mensaje no
     * quede dando vueltas para siempre, no cuántas veces pidió turno.
     */
    public function retryUntil(): \DateTimeInterface
    {
        return now()->addMinutes(10);
    }

    /**
     * Un mensaje a la vez por número.
     *
     * Mandar cuatro fotos seguidas son cuatro mensajes, y por lo tanto cuatro
     * trabajos. Sin esto se procesan al tiempo, y como el historial de la
     * conversación se lee y se reescribe entero, el último en guardar borra
     * lo que escribieron los otros: el modelo pierde de vista las fotos que
     * ya habían llegado. En fila india llegan todas al mismo hilo.
     *
     * @return array<int, object>
     */
    public function middleware(): array
    {
        return [(new WithoutOverlapping('chatbot:'.$this->de))
            // Vuelve a la cola en vez de descartarse: el mensaje del admin no
            // se puede perder solo porque llegó mientras se atendía otro.
            ->releaseAfter(3)
            // Si el trabajo que tiene el turno muere sin soltarlo, el
            // candado se suelta solo pasado este tiempo. Va por encima del
            // timeout de 180s para no soltarlo con el otro todavía vivo.
            ->expireAfter(240)];
    }

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
