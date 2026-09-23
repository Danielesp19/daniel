<?php

namespace Tests\Feature;

use App\Jobs\ResponderMensajeChatbot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * El webhook del chatbot es público: cualquiera en internet puede pegarle.
 * Lo único que separa un mensaje de WhatsApp de la base de datos es la firma
 * HMAC y el número reservado del dueño, así que ambos se prueban.
 */
class ChatbotWebhookTest extends TestCase
{
    use RefreshDatabase;

    private const SECRETO = 'secreto-de-prueba';

    private const ADMIN = '573001112233';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'tienda.chatbot.app_secret' => self::SECRETO,
            'tienda.chatbot.admin' => self::ADMIN,
            'tienda.chatbot.verify_token' => 'token-de-verificacion',
        ]);
        Queue::fake();
    }

    /** @return array{0: string, 1: array<string, string>} cuerpo y cabeceras firmadas */
    private function mensaje(string $de, string $texto, string $id = 'wamid.1'): array
    {
        $cuerpo = json_encode([
            'entry' => [[
                'changes' => [[
                    'value' => [
                        'messages' => [[
                            'id' => $id,
                            'from' => $de,
                            'type' => 'text',
                            'text' => ['body' => $texto],
                        ]],
                    ],
                ]],
            ]],
        ], JSON_THROW_ON_ERROR);

        return [
            $cuerpo,
            ['X-Hub-Signature-256' => 'sha256='.hash_hmac('sha256', $cuerpo, self::SECRETO)],
        ];
    }

    public function test_un_mensaje_firmado_de_un_admin_se_encola(): void
    {
        [$cuerpo, $cabeceras] = $this->mensaje(self::ADMIN, '¿cuánto queda del mirador?');

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertOk();

        Queue::assertPushed(ResponderMensajeChatbot::class, 1);
    }

    public function test_una_firma_invalida_se_rechaza(): void
    {
        [$cuerpo] = $this->mensaje(self::ADMIN, 'súmale 20 al mirador');
        $cabeceras = ['X-Hub-Signature-256' => 'sha256='.str_repeat('a', 64)];

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertForbidden();

        Queue::assertNothingPushed();
    }

    public function test_un_cuerpo_alterado_despues_de_firmar_se_rechaza(): void
    {
        [$cuerpo, $cabeceras] = $this->mensaje(self::ADMIN, 'sumale 1 al mirador');

        // Solo texto ASCII en el mensaje: json_encode escapa los acentos a
        // \uXXXX, así que un str_replace con tildes no encontraría nada y la
        // prueba pasaría sin haber alterado el cuerpo — un falso verde.
        $alterado = str_replace('sumale 1', 'sumale 900', $cuerpo);
        $this->assertNotSame($cuerpo, $alterado, 'la prueba debe alterar el cuerpo de verdad');

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $alterado)
            ->assertForbidden();

        Queue::assertNothingPushed();
    }

    public function test_un_numero_que_no_es_admin_se_ignora_en_silencio(): void
    {
        [$cuerpo, $cabeceras] = $this->mensaje('573009998877', 'pon todo en cero');

        // 200, no 403: a Meta se le responde OK siempre. Un 403 aquí haría que
        // reintentara el mensaje una y otra vez.
        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertOk();

        Queue::assertNothingPushed();
    }

    public function test_el_remitente_se_reconoce_aunque_venga_con_mas_y_espacios(): void
    {
        // El número configurado queda en dígitos pelados. Si el remitente
        // llega con adornos —otra pasarela, un reenvío, un "+" de más— tiene
        // que seguir siendo el mismo dueño y no un desconocido.
        [$cuerpo, $cabeceras] = $this->mensaje('+57 300 111 2233', '¿cómo vamos?');

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertOk();

        Queue::assertPushed(ResponderMensajeChatbot::class, 1);
    }

    public function test_el_numero_llega_normalizado_al_trabajo_de_la_cola(): void
    {
        // La misma cadena de dígitos es la llave del historial y de la cola
        // de fotos. Si el trabajo recibiera el número con adornos, el mismo
        // admin tendría dos conversaciones distintas según cómo escribiera.
        [$cuerpo, $cabeceras] = $this->mensaje('+57 300 111 2233', 'mándame el resumen');

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo);

        Queue::assertPushed(
            ResponderMensajeChatbot::class,
            fn (ResponderMensajeChatbot $job) => (new \ReflectionProperty($job, 'de'))
                ->getValue($job) === self::ADMIN,
        );
    }

    public function test_sin_numero_configurado_no_entra_nadie(): void
    {
        // Fallar cerrado: con el número vacío, una comparación descuidada
        // daría por bueno cualquier remitente y abriría la base a internet.
        config(['tienda.chatbot.admin' => '']);

        [$cuerpo, $cabeceras] = $this->mensaje(self::ADMIN, 'pon todo en cero');

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertOk();

        Queue::assertNothingPushed();
    }

    public function test_un_segundo_numero_de_la_lista_vieja_ya_no_administra(): void
    {
        // Al pasar de lista a número único, los demás dejan de mandar. Se
        // prueba explícitamente porque es el cambio de comportamiento que
        // más fácil pasa desapercibido en un despliegue existente.
        config(['tienda.chatbot.admins_jubilados' => ['573009998877']]);

        [$cuerpo, $cabeceras] = $this->mensaje('573009998877', 'súbele el precio al geisha');

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertOk();

        Queue::assertNothingPushed();
    }

    public function test_el_mismo_mensaje_reenviado_por_meta_no_se_procesa_dos_veces(): void
    {
        [$cuerpo, $cabeceras] = $this->mensaje(self::ADMIN, 'súmale 12', 'wamid.repetido');

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)->assertOk();
        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)->assertOk();

        // Sin la marca de deduplicación, un reenvío sumaría las bolsas de nuevo.
        Queue::assertPushed(ResponderMensajeChatbot::class, 1);
    }

    public function test_una_foto_con_pie_se_encola_igual_que_un_texto(): void
    {
        // Es la vía por la que se cambian las imágenes del sitio sin abrir el
        // panel: si el webhook descarta las fotos, no hay otra forma.
        $cuerpo = json_encode([
            'entry' => [['changes' => [['value' => ['messages' => [[
                'id' => 'wamid.foto',
                'from' => self::ADMIN,
                'type' => 'image',
                'image' => ['id' => '999888', 'caption' => 'esta es la del mirador'],
            ]]]]]]],
        ], JSON_THROW_ON_ERROR);

        $cabeceras = ['X-Hub-Signature-256' => 'sha256='.hash_hmac('sha256', $cuerpo, self::SECRETO)];

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertOk();

        Queue::assertPushed(ResponderMensajeChatbot::class, 1);
    }

    public function test_una_foto_sin_pie_tambien_se_encola(): void
    {
        // Manda la foto y en el mensaje siguiente dice de qué producto es.
        $cuerpo = json_encode([
            'entry' => [['changes' => [['value' => ['messages' => [[
                'id' => 'wamid.foto2',
                'from' => self::ADMIN,
                'type' => 'image',
                'image' => ['id' => '999888'],
            ]]]]]]],
        ], JSON_THROW_ON_ERROR);

        $cabeceras = ['X-Hub-Signature-256' => 'sha256='.hash_hmac('sha256', $cuerpo, self::SECRETO)];

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertOk();

        Queue::assertPushed(ResponderMensajeChatbot::class, 1);
    }

    public function test_un_audio_se_ignora_sin_reventar(): void
    {
        $cuerpo = json_encode([
            'entry' => [['changes' => [['value' => ['messages' => [[
                'id' => 'wamid.audio',
                'from' => self::ADMIN,
                'type' => 'audio',
                'audio' => ['id' => '777'],
            ]]]]]]],
        ], JSON_THROW_ON_ERROR);

        $cabeceras = ['X-Hub-Signature-256' => 'sha256='.hash_hmac('sha256', $cuerpo, self::SECRETO)];

        $this->call('POST', '/api/chatbot/webhook', [], [], [], $this->servidor($cabeceras), $cuerpo)
            ->assertOk();

        Queue::assertNothingPushed();
    }

    public function test_la_verificacion_inicial_devuelve_el_reto_de_meta(): void
    {
        $this->get('/api/chatbot/webhook?hub_mode=subscribe&hub_verify_token=token-de-verificacion&hub_challenge=12345')
            ->assertOk()
            ->assertSee('12345');
    }

    public function test_la_verificacion_con_token_equivocado_se_rechaza(): void
    {
        $this->get('/api/chatbot/webhook?hub_verify_token=equivocado&hub_challenge=12345')
            ->assertForbidden();
    }

    /**
     * Las cabeceras HTTP en $_SERVER van con prefijo HTTP_ y guiones bajos.
     *
     * @param  array<string, string>  $cabeceras
     * @return array<string, string>
     */
    private function servidor(array $cabeceras): array
    {
        $servidor = ['CONTENT_TYPE' => 'application/json'];
        foreach ($cabeceras as $nombre => $valor) {
            $servidor['HTTP_'.str_replace('-', '_', strtoupper($nombre))] = $valor;
        }

        return $servidor;
    }
}
