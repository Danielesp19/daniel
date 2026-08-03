<?php

namespace App\Support\Chatbot;

use Anthropic\Beta\Messages\BetaTextBlock;
use Anthropic\Beta\Messages\BetaToolUseBlock;
use Anthropic\Client;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * El asistente de inventario: traduce un mensaje de WhatsApp en llamadas a las
 * herramientas del catálogo y responde en texto plano.
 */
class Asistente
{
    /**
     * Vueltas máximas del ciclo pedir → ejecutar herramienta → volver a pedir.
     * Consultar y ajustar un producto son dos llamadas; seis deja margen para
     * varios productos en un mismo mensaje sin poder quedarse en un bucle
     * infinito quemando tokens.
     */
    private const MAX_VUELTAS = 6;

    /**
     * Tope de salida por vuelta. Generoso a propósito: en Claude Opus 5 el
     * pensamiento va incluido en este límite, y quedarse corto no da un error
     * claro sino una respuesta cortada a la mitad.
     */
    private const MAX_TOKENS = 16000;

    public function __construct(private ?Client $cliente = null)
    {
        $this->cliente ??= new Client(apiKey: (string) config('tienda.chatbot.anthropic_key'));
    }

    /**
     * Procesa un mensaje y devuelve la respuesta lista para enviar.
     *
     * @param  string  $de  Número del admin en E.164 sin "+". Es la llave de la memoria.
     */
    public function responder(string $texto, string $de): string
    {
        $historial = $this->historial($de);
        $mensajes = [...$historial, ['role' => 'user', 'content' => $texto]];

        try {
            $respuesta = $this->conversar($mensajes);
        } catch (\Throwable $e) {
            Log::error('Chatbot: falló la conversación con Claude', [
                'de' => substr($de, -4),  // solo los últimos 4 dígitos en el log
                'error' => $e->getMessage(),
            ]);

            return 'Se me cayó la conexión procesando eso. Vuelve a escribirme en un momento.';
        }

        // La memoria guarda SOLO el texto de ida y vuelta, no los bloques de
        // herramientas ni el pensamiento. Es lo que hace falta para que
        // "súmale 12" entienda de qué café hablábamos, y evita tener que
        // serializar objetos del SDK a caché (que se rompería en cada cambio
        // de versión). El costo es que el modelo no ve los resultados crudos
        // de herramientas de turnos viejos — si los necesita, los vuelve a
        // consultar, que además garantiza que el stock esté fresco.
        $this->recordar($de, $texto, $respuesta);

        return $respuesta;
    }

    /** @param array<int, array<string, mixed>> $mensajes */
    private function conversar(array $mensajes): string
    {
        $herramientas = Herramientas::definiciones();

        for ($vuelta = 0; $vuelta < self::MAX_VUELTAS; $vuelta++) {
            $respuesta = $this->cliente->beta->messages->create(
                model: (string) config('tienda.chatbot.modelo'),
                maxTokens: self::MAX_TOKENS,
                system: $this->instrucciones(),
                messages: $mensajes,
                tools: $herramientas,
                // Esfuerzo bajo: consultar stock y sumar bolsas no necesita
                // razonamiento profundo, y en un chat la latencia se siente.
                // NO se desactiva el pensamiento: con `thinking` apagado el
                // modelo a veces escribe la llamada a la herramienta como
                // texto en vez de emitirla, y entonces el ajuste de stock
                // nunca ocurre — sin error, sin aviso. Bajar el esfuerzo
                // ahorra lo mismo sin ese riesgo.
                outputConfig: ['effort' => 'low'],
                // Si los clasificadores de seguridad rechazan la petición
                // (improbable hablando de café, pero posible con un falso
                // positivo), el servidor la reintenta solo en el modelo de
                // respaldo en la misma llamada, en vez de dejar al admin sin
                // respuesta.
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );

            // Siempre revisar stopReason ANTES de leer el contenido: en un
            // rechazo `content` viene vacío o a medias.
            if ($respuesta->stopReason === 'refusal') {
                Log::warning('Chatbot: petición rechazada por los clasificadores', [
                    'categoria' => $respuesta->stopDetails?->category,
                ]);

                return 'No puedo ayudarte con eso. Pregúntame por el inventario, los precios o los datos de los productos.';
            }

            $mensajes[] = ['role' => 'assistant', 'content' => $respuesta->content];

            if ($respuesta->stopReason !== 'tool_use') {
                return $this->textoDe($respuesta->content)
                    ?: 'Listo, pero no supe cómo resumírtelo. Pregúntame de otra forma.';
            }

            // Todos los resultados de un turno van en UN solo mensaje de
            // usuario: repartirlos en varios le enseña al modelo a dejar de
            // pedir herramientas en paralelo.
            $resultados = [];
            foreach ($respuesta->content as $bloque) {
                if (! $bloque instanceof BetaToolUseBlock) {
                    continue;
                }
                $resultados[] = [
                    'type' => 'tool_result',
                    'toolUseID' => $bloque->id,
                    'content' => json_encode(
                        Herramientas::ejecutar($bloque->name, $bloque->input),
                        JSON_UNESCAPED_UNICODE,
                    ),
                ];
            }

            $mensajes[] = ['role' => 'user', 'content' => $resultados];
        }

        Log::warning('Chatbot: se agotaron las vueltas de herramientas');

        return 'Me enredé haciendo esa consulta. ¿Me la pides de a un producto a la vez?';
    }

    /** @param array<int, mixed> $contenido */
    private function textoDe(array $contenido): string
    {
        $partes = [];
        foreach ($contenido as $bloque) {
            if ($bloque instanceof BetaTextBlock) {
                $partes[] = $bloque->text;
            }
        }

        return trim(implode("\n", $partes));
    }

    private function instrucciones(): string
    {
        $categorias = Herramientas::contextoCategorias();

        return <<<TXT
        Eres el asistente de inventario de un barista profesional colombiano que vende café
        de especialidad y también presta servicios (asesorías, clases y barra para eventos).
        Hablas por WhatsApp con un administrador del negocio ya autenticado, así que puedes
        consultar y modificar el catálogo sin pedir credenciales.

        Categorías del catálogo: {$categorias}.

        Cada producto trae un campo "tipo". Los de tipo "servicio" se agendan, no se cuentan
        en bolsas: no tienen stock y no se pueden ajustar. Si el admin te pide cambiarle el
        inventario a uno, explícale eso; su precio y su descripción sí se pueden editar.

        # Cómo trabajas
        - Busca siempre el producto antes de modificarlo. Nunca inventes un id.
        - Si la búsqueda devuelve varios productos parecidos, pregunta cuál antes de tocar nada.
        - Antes de cambiar un precio o desactivar un producto, confirma con el admin. Ajustar
          stock no necesita confirmación: es la operación del día a día y es fácil de revertir.
        - Si el mensaje no deja claro si el número es lo que llegó, lo que salió o lo que queda,
          pregunta. Equivocarse de acción descuadra el inventario.
        - Cuando termines un cambio, di el antes y el después con números concretos.
        - Avisa por tu cuenta cuando un producto quede agotado o por acabarse tras un ajuste.

        # Cómo escribes
        - Español colombiano, directo y corto. Es un chat, no un informe.
        - Sin markdown: WhatsApp no lo renderiza. Nada de #, ** ni tablas. Listas con guiones.
        - Los precios en pesos con puntos de mil: 48.000, no 48000 ni \$48000.00.
        - El stock se cuenta en bolsas.
        - Si algo falla, dilo en una frase y sigue; no te disculpes de más ni expliques el error técnico.
        TXT;
    }

    /** @return array<int, array<string, string>> */
    private function historial(string $de): array
    {
        return Cache::get($this->llave($de), []);
    }

    private function recordar(string $de, string $pregunta, string $respuesta): void
    {
        $turnos = [
            ...$this->historial($de),
            ['role' => 'user', 'content' => $pregunta],
            ['role' => 'assistant', 'content' => $respuesta],
        ];

        // Se conservan los últimos N mensajes, y el recorte empieza en un
        // turno de usuario: la API exige que el primer mensaje sea "user".
        $limite = max(2, (int) config('tienda.chatbot.memoria_turnos', 12));
        $turnos = array_slice($turnos, -$limite);
        while ($turnos && $turnos[0]['role'] !== 'user') {
            array_shift($turnos);
        }

        Cache::put(
            $this->llave($de),
            $turnos,
            now()->addMinutes((int) config('tienda.chatbot.memoria_minutos', 30)),
        );
    }

    private function llave(string $de): string
    {
        return 'chatbot:hist:'.sha1($de);
    }
}
