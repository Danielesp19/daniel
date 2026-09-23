<?php

namespace App\Support\Chatbot;

use Anthropic\Beta\Messages\BetaTextBlock;
use Anthropic\Beta\Messages\BetaToolUseBlock;
use Anthropic\Client;
use App\Models\ConsumoChatbot;
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
     *
     * Consultar y ajustar un producto son dos llamadas, pero armar un kit son
     * muchas más: crearlo, agregarle las piezas y engancharle una foto a cada
     * una. Con seis, ese flujo se cortaba a la mitad y dejaba el kit a medio
     * hacer. Doce le alcanzan sin dejar de ser un techo contra un bucle que
     * queme tokens sin avanzar.
     */
    private const MAX_VUELTAS = 12;

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
     * @param  string|null  $mediaId  Id del medio en Meta si mandó una foto.
     */
    public function responder(string $texto, string $de, ?string $mediaId = null): string
    {
        // El tope se revisa ANTES de bajar la foto y antes de llamar al
        // modelo: es lo único que de verdad corta el gasto, y un tope que se
        // comprueba después de gastar no es un tope.
        if (ConsumoChatbot::topeAlcanzado()) {
            return $this->avisoDeTope();
        }

        if ($mediaId !== null) {
            $texto = $this->recibirFoto($mediaId, $de, $texto);
        }

        $historial = $this->historial($de);
        $mensajes = [...$historial, ['role' => 'user', 'content' => $texto]];

        try {
            $respuesta = $this->conversar($mensajes, $de);
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
        ConsumoChatbot::contarMensaje();

        return $respuesta.$this->coletillaDeSaldo();
    }

    /**
     * Lo que se responde cuando ya se gastó el tope del mes.
     *
     * Se contesta igual —no se deja al admin hablándole a una pared— pero sin
     * tocar la API: el mensaje se arma acá con texto fijo.
     */
    private function avisoDeTope(): string
    {
        $consumo = ConsumoChatbot::delMes();
        $tope = number_format((int) config('tienda.chatbot.tope_mensual_centavos') / 100, 2);

        return "Llegamos al tope de gasto de este mes (US\${$consumo->dolares()} de US\${$tope}), "
            .'así que no puedo procesar más cambios hasta el primero del mes que viene. '
            .'Si necesitas seguir hoy, súbele el tope en la configuración o entra al panel web.';
    }

    /**
     * El aviso de "se está acabando el saldo", una sola vez en el mes.
     *
     * Va pegado a la respuesta normal en vez de como mensaje aparte: llega en
     * el mismo globo, sin interrumpir lo que el admin estaba haciendo, y sin
     * gastar otra llamada a WhatsApp.
     */
    private function coletillaDeSaldo(): string
    {
        $tope = (int) config('tienda.chatbot.tope_mensual_centavos');
        if ($tope <= 0) {
            return '';
        }

        $umbral = $tope * max(1, min(99, (int) config('tienda.chatbot.aviso_tope_porcentaje', 80))) / 100;
        $consumo = ConsumoChatbot::delMes();

        if ($consumo->aviso_enviado || $consumo->costo_centavos < $umbral) {
            return '';
        }

        $consumo->update(['aviso_enviado' => true]);
        $restante = number_format(max(0, $tope - $consumo->costo_centavos) / 100, 2);

        return "\n\n(Aviso: este mes ya van US\${$consumo->dolares()} de US\$"
            .number_format($tope / 100, 2).". Quedan US\${$restante}.)";
    }

    /**
     * Baja la foto, la mete en la cola y arma el texto que verá el modelo.
     *
     * La imagen se guarda YA, antes de hablar con el modelo: si se esperara a
     * que él decidiera, habría que sostener la URL temporal de Meta —que
     * caduca— durante toda la conversación. Queda en la cola de este número,
     * y `asignar_foto` la engancha a donde él diga, aunque lo diga en el
     * mensaje siguiente.
     */
    private function recibirFoto(string $mediaId, string $de, string $pieDeFoto): string
    {
        $ruta = (new WhatsApp)->descargarFoto($mediaId);

        if ($ruta === null) {
            return trim($pieDeFoto."\n\n[Sistema: el admin mandó una foto pero no se pudo procesar. "
                .'Dile que la reenvíe, y que sea una imagen (no un archivo ni un video).]');
        }

        $posicion = ColaDeFotos::agregar($de, $ruta);

        // El número de la foto viaja en el aviso porque mandar cuatro fotos
        // seguidas son cuatro mensajes distintos, cada uno con su vuelta del
        // modelo: sin decirle en cuál posición quedó cada una, no tiene cómo
        // saber que "la tercera" es la del filtro.
        $aviso = $posicion === 1
            ? '[Sistema: llegó una foto del admin y quedó guardada (es la única en espera). '
                .'Para usarla llama asignar_foto con el id del producto. Si no dijo de qué es, pregúntaselo.]'
            : "[Sistema: llegó otra foto del admin y quedó guardada en la posición {$posicion} de la cola, "
                ."en orden de llegada. Hay {$posicion} fotos esperando. Cuando uses asignar_foto dile "
                .'cuál con numero_foto. Si no está claro qué foto va con qué cosa, pregúntaselo antes '
                .'de asignar ninguna.]';

        return $pieDeFoto === '' ? $aviso : $pieDeFoto."\n\n".$aviso;
    }

    /** @param array<int, array<string, mixed>> $mensajes */
    private function conversar(array $mensajes, string $de): string
    {
        $herramientas = Herramientas::definiciones();

        // Se arma UNA vez para todo el mensaje, no una por vuelta. Dos
        // razones: lee las categorías de la base, y si el modelo crea una a
        // mitad del camino el texto cambiaría entre vueltas —invalidando el
        // caché justo en las llamadas donde más se aprovecha—. Que el prompt
        // no mencione la categoría recién creada no importa: el resultado de
        // la herramienta ya se la nombró.
        $instrucciones = $this->instrucciones();

        for ($vuelta = 0; $vuelta < self::MAX_VUELTAS; $vuelta++) {
            $respuesta = $this->cliente->beta->messages->create(
                model: (string) config('tienda.chatbot.modelo'),
                maxTokens: self::MAX_TOKENS,
                // El prompt del sistema y las definiciones de herramientas
                // son idénticos en cada vuelta, y se reenvían enteros cada
                // vez: son la mayor parte de lo que se paga. Marcado así, la
                // relectura cuesta una décima parte.
                //
                // La marca va en el bloque del sistema y no en las
                // herramientas porque el orden de armado es herramientas →
                // sistema → mensajes: marcar el final del sistema guarda las
                // dos cosas de una. Lo único que cambia entre llamadas es la
                // lista de mensajes, que va después y por eso no rompe nada.
                //
                // Con la duración corta (la de por defecto) y no la de una
                // hora: lo que se repite de verdad son las vueltas de un
                // mismo mensaje, que pasan con segundos de diferencia, y
                // guardar por una hora cuesta más caro escribirlo.
                system: [[
                    'type' => 'text',
                    'text' => $instrucciones,
                    'cacheControl' => ['type' => 'ephemeral'],
                ]],
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

            // El gasto se apunta apenas vuelve la llamada, antes de mirar si
            // sirvió: una respuesta rechazada o cortada se paga igual, y un
            // medidor que solo cuenta los aciertos miente.
            $this->apuntarGasto($respuesta);

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
                        // El número va como contexto: `asignar_foto` necesita
                        // saber de quién es la foto que quedó en espera.
                        Herramientas::ejecutar($bloque->name, $bloque->input, $de),
                        JSON_UNESCAPED_UNICODE,
                    ),
                ];
            }

            $mensajes[] = ['role' => 'user', 'content' => $resultados];
        }

        Log::warning('Chatbot: se agotaron las vueltas de herramientas');

        return 'Me enredé haciendo esa consulta. ¿Me la pides de a un producto a la vez?';
    }

    /**
     * Apunta en el medidor lo que costó una llamada.
     *
     * Nunca deja caer la conversación: si el medidor falla —la tabla no
     * migrada todavía, la base ocupada— se registra en el log y el admin
     * igual recibe su respuesta. Perder la cuenta de unos centavos es mucho
     * menos grave que dejar sin panel a quien está despachando.
     */
    private function apuntarGasto(object $respuesta): void
    {
        try {
            $uso = $respuesta->usage ?? null;
            if ($uso === null) {
                return;
            }

            ConsumoChatbot::registrar(
                $uso->inputTokens,
                $uso->outputTokens,
                $uso->cacheReadInputTokens ?? 0,
                $uso->cacheCreationInputTokens ?? 0,
            );
        } catch (\Throwable $e) {
            Log::warning('Chatbot: no se pudo apuntar el consumo', ['error' => $e->getMessage()]);
        }
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
        Administras el sitio web de un barista profesional colombiano que vende café de
        especialidad y presta servicios (asesorías, clases y barra para eventos).

        Hablas por WhatsApp con el dueño del negocio, ya autenticado. ESTE CHAT ES SU PANEL
        DE ADMINISTRACIÓN: no tiene otro, y no quiere abrir un navegador para nada. Todo lo
        que te pida sobre su página lo resuelves aquí — precios, textos, fotos, productos
        nuevos, secciones. Nunca lo mandes a "entrar al panel" ni le digas que algo hay que
        hacerlo por computador; si de verdad no puedes hacer algo, dilo claro y punto.

        Categorías del catálogo: {$categorias}.

        # Cosas del negocio que tienes que tener claras
        - Cada producto trae un campo "tipo". Los de tipo "servicio" se agendan, no se cuentan
          en bolsas: no tienen stock y no se les puede ajustar. Su precio y su descripción sí
          se editan.
        - AGOTADO y OCULTO no son lo mismo, y confundirlos le borra un producto de la página:
          · "se acabó", "sin stock", "no hay" → ajustar_stock con fijar 0. El producto SIGUE
            visible en la página con un sello de AGOTADO, solo que no se puede pedir.
          · "quítalo", "bájalo de la página", "que no aparezca" → editar_producto con activo
            en false. Eso sí lo desaparece del sitio.
          Si no queda claro cuál de las dos quiere, pregúntale.
        - Los precios son enteros de pesos: 48000. Nunca decimales.
        - UN KIT es un producto que se vende como una sola cosa —un precio, una línea en el
          pedido— pero que por dentro trae varias. Lo que trae se cuenta de DOS formas
          distintas y no son intercambiables:
          · PIEZAS: cosas que solo existen dentro del kit y no se venden sueltas (los filtros
            de papel, la bolsa de muestra, la cuchara medidora). Llevan nombre y foto, nada
            más: no tienen precio porque no se venden, ni stock porque el que se cuenta es
            el del kit. Van en `piezas`.
          · COMPONENTES: productos que YA existen en el catálogo y se venden solos, y que
            además vienen dentro del kit (la prensa francesa, una bolsa de café). Van en
            `componentes`, por id.
          Si el admin nombra algo y no sabes de cuál de las dos se trata, búscalo primero en
          el catálogo: si aparece, es componente; si no, es pieza. Cuando quede en duda,
          pregúntale — un componente mal puesto le cambia la ficha al kit.
        - El stock del kit es propio: vender un kit NO descuenta las bolsas de sus
          componentes. Quien lo arma en el mostrador decide cuántos hay listos.
        - EL INVENTARIO SE LLEVA POR SEDE. Cada producto tiene bolsas en cada punto de venta,
          y el número que ve el cliente en la página es la suma de todas. Por eso:
          · Antes de mover stock necesitas saber en CUÁL sede. Si el admin no lo dijo,
            pregúntaselo — mover bolsas en la sede equivocada daña dos inventarios de una vez.
            Usa listar_sedes si no recuerdas cuáles hay.
          · Un producto en cero en una sede NO está agotado si le quedan en otra. Agotado es
            cuando el total llega a cero. Al reportar un ajuste di las dos cifras: cómo quedó
            esa sede y cómo quedó el total.
          · Cuando pregunte "¿cuánto queda de X?", si está repartido di dónde está: "quedan
            cinco: tres en el Centro y dos en Bogotá" sirve mucho más que "quedan cinco".

        # Cómo trabajas
        - Busca siempre el producto antes de modificarlo. Nunca inventes un id.
        - Si la búsqueda devuelve varios parecidos, pregunta cuál antes de tocar nada.
        - Antes de cambiar un precio, esconder un producto o esconder una sección entera,
          confirma con él. Ajustar stock y arreglar textos no necesitan confirmación: son el
          día a día y se revierten fácil.
        - Si el mensaje no deja claro si el número es lo que llegó, lo que salió o lo que
          queda, pregunta. Equivocarse de acción descuadra el inventario.
        - Cuando te mande una foto, ya queda guardada y hace fila. Solo necesitas saber de
          qué es: si no lo dijo, pregúntale. Si te la manda antes de crear el producto,
          créalo primero y después asígnasela.
        - Puede mandarte VARIAS fotos seguidas, y cada una llega como un mensaje aparte.
          Se numeran por orden de llegada (1 es la primera que mandó) y se usan con
          numero_foto. Con más de una esperando NUNCA adivines cuál va dónde: mira la cola
          con fotos_pendientes y pregúntale. Ponerle al café la foto del molino es un error
          que nadie nota hasta que un cliente abre la página.
        - Para armar un kit el orden que funciona es: crear el kit con sus piezas por
          nombre, y después pedirle las fotos de cada pieza. Pedirlas antes deja fotos
          sueltas sin dónde ponerlas.
        - Cuando termines un cambio, di el antes y el después con números concretos.
        - Avisa por tu cuenta cuando un producto quede agotado o por acabarse tras un ajuste.

        # Cómo escribes
        - Español colombiano, directo y corto. Es un chat, no un informe.
        - Sin markdown: WhatsApp no lo renderiza. Nada de #, ** ni tablas. Listas con guiones.
        - Los precios en pesos con puntos de mil: 48.000, no 48000 ni \$48000.00.
        - El stock se cuenta en bolsas.
        - Si algo falla, dilo en una frase y sigue; no te disculpes de más ni expliques el
          error técnico.
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
