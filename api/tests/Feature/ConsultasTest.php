<?php

namespace Tests\Feature;

use App\Models\Consulta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * El buzón de preguntas es el único punto donde alguien sin autenticar escribe
 * en la base. Lo que se prueba acá es que la pregunta no se pierda nunca y que
 * la puerta no quede abierta de par en par.
 */
class ConsultasTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'token-de-prueba';

    protected function setUp(): void
    {
        parent::setUp();
        config(['tienda.admin_token' => self::TOKEN]);
    }

    public function test_cualquiera_puede_dejar_una_pregunta(): void
    {
        $this->postJson('/api/consultas', [
            'mensaje' => '¿Hacen envíos a Pitalito el mismo día?',
            'contacto' => 'cliente@correo.co',
        ])->assertCreated()->assertJsonPath('ok', true);

        $this->assertSame(1, Consulta::count());
        $this->assertFalse(Consulta::first()->atendida);
    }

    public function test_el_contacto_es_opcional(): void
    {
        // Pedir datos obligatorios en un "déjame tu pregunta" espanta a la
        // mitad de la gente, y una pregunta sin remitente igual sirve.
        $this->postJson('/api/consultas', ['mensaje' => '¿Venden molinos manuales?'])
            ->assertCreated();

        $this->assertNull(Consulta::first()->contacto);
    }

    public function test_un_mensaje_vacio_o_muy_corto_se_rechaza(): void
    {
        $this->postJson('/api/consultas', ['mensaje' => ''])->assertStatus(422);
        $this->postJson('/api/consultas', ['mensaje' => 'hm'])->assertStatus(422);

        $this->assertSame(0, Consulta::count());
    }

    public function test_la_pregunta_se_guarda_aunque_el_correo_falle(): void
    {
        // Es lo que sostiene todo el diseño: el correo es un aviso encima, no
        // el almacenamiento. Si reventara la pregunta, se perdería en silencio.
        config(['tienda.consultas_correo' => 'hola@ejemplo.co']);
        Mail::shouldReceive('raw')->once()->andThrow(new \RuntimeException('SMTP caído'));

        $this->postJson('/api/consultas', ['mensaje' => '¿Tienen descafeinado?'])
            ->assertCreated();

        $this->assertSame(1, Consulta::count());
    }

    public function test_sin_correo_configurado_no_se_intenta_enviar(): void
    {
        config(['tienda.consultas_correo' => '']);
        Mail::shouldReceive('raw')->never();

        $this->postJson('/api/consultas', ['mensaje' => '¿Tienen descafeinado?'])
            ->assertCreated();
    }

    public function test_el_buzon_del_panel_exige_token(): void
    {
        $this->getJson('/api/admin/consultas')->assertUnauthorized();
    }

    public function test_el_panel_lista_y_marca_como_atendida(): void
    {
        $consulta = Consulta::create(['mensaje' => '¿Hacen envíos?']);

        $this->withToken(self::TOKEN)->getJson('/api/admin/consultas')
            ->assertOk()
            ->assertJsonPath('0.atendida', false);

        $this->withToken(self::TOKEN)->patchJson("/api/admin/consultas/{$consulta->id}")
            ->assertOk()
            ->assertJsonPath('atendida', true);

        // Y vuelve a pendiente: marcar por error no puede ser irreversible.
        $this->withToken(self::TOKEN)->patchJson("/api/admin/consultas/{$consulta->id}")
            ->assertJsonPath('atendida', false);
    }
}
